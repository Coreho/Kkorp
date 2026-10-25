<#
.SYNOPSIS
Copies the newest KoreoKorp content backup from the VPS to this computer.

.DESCRIPTION
The off-server half of TASK-022, run daily by Task Scheduler. It asks the
server whether its newest backup is recent, downloads that backup if it is not
already here, checks its SHA-256 against the server's checksum file, and keeps
the newest -Keep copies. Every run appends one line to pull.log in the
destination folder. The folder is restricted to the current user because each
backup contains the editor's password hash.

Run with -Check to report the age of the newest local copy without connecting.
Written for Windows PowerShell 5.1, which Task Scheduler can always start.
#>
param(
  [string]$HostAlias = 'digihoe',
  [string]$RemoteDir = 'backups/koreokorp-content',
  [string]$RemoteScript = 'koreokorp-backup/backup-content.sh',
  [string]$Destination = (Join-Path $env:USERPROFILE 'KoreoKorp-backups'),
  [int]$Keep = 30,
  [int]$MaxAgeHours = 50,
  [switch]$Check
)

$ErrorActionPreference = 'Stop'
$namePattern = '^koreokorp-content-\d{8}T\d{6}Z\.tar\.gz$'
$log = Join-Path $Destination 'pull.log'

function Write-Log([string]$message) {
  $line = '{0} {1}' -f (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'), $message
  Add-Content -Path $log -Value $line
  Write-Output $line
}

function Get-LocalBackups {
  Get-ChildItem -Path $Destination -File | Where-Object { $_.Name -match $namePattern } | Sort-Object Name -Descending
}

# Windows PowerShell 5.1 turns redirected native stderr (such as the server's
# login banner) into terminating errors under 'Stop', so collect it instead.
function Invoke-Native([string]$program, [string[]]$arguments) {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { $output = & $program @arguments 2>&1 }
  finally { $ErrorActionPreference = $previous }
  $stdout = ($output | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] } | Out-String).Trim()
  $stderr = (($output | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] } | ForEach-Object { $_.Exception.Message }) -join ' ').Trim()
  if ($LASTEXITCODE -ne 0) { throw ("$program failed ($LASTEXITCODE): $stdout $stderr").Trim() }
  return $stdout
}

function Invoke-Remote([string]$command) {
  Invoke-Native 'ssh' @('-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', $HostAlias, $command)
}

if (-not (Test-Path $Destination)) {
  New-Item -ItemType Directory -Path $Destination | Out-Null
  $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls $Destination /inheritance:r /grant:r "${user}:(OI)(CI)F" | Out-Null
}

if ($Check) {
  $newest = Get-LocalBackups | Select-Object -First 1
  if (-not $newest) { Write-Log 'FAIL no local backup'; exit 1 }
  $age = [int]((Get-Date) - $newest.LastWriteTime).TotalHours
  if ($age -ge $MaxAgeHours) { Write-Log "FAIL newest local backup $($newest.Name) is ${age}h old"; exit 1 }
  Write-Log "OK newest local backup $($newest.Name) is ${age}h old"
  exit 0
}

try {
  $status = Invoke-Remote "~/$RemoteScript --check"
  $name = Invoke-Remote "cat $RemoteDir/latest"
  if ($name -notmatch $namePattern) { throw "unexpected latest backup name: $name" }
  $target = Join-Path $Destination $name
  if (Test-Path $target) {
    Write-Log "OK $name already here; server: $status"
  } else {
    $expected = (Invoke-Remote "cat $RemoteDir/daily/$name.sha256").Split(' ')[0].ToLowerInvariant()
    $partial = "$target.partial"
    Invoke-Native 'scp' @('-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', "${HostAlias}:$RemoteDir/daily/$name", $partial) | Out-Null
    $actual = (Get-FileHash -Algorithm SHA256 -Path $partial).Hash.ToLowerInvariant()
    if ($actual -ne $expected) {
      Remove-Item $partial
      throw "checksum mismatch for $name"
    }
    Move-Item $partial $target
    Write-Log "OK pulled $name ($((Get-Item $target).Length) bytes, sha256 verified); server: $status"
  }
  Get-LocalBackups | Select-Object -Skip $Keep | Remove-Item
} catch {
  Write-Log "FAIL $($_.Exception.Message)"
  exit 1
}
