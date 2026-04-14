$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot"

$env:CARGO_HOME = "D:\DevTools\Rust\cargo"
$env:RUSTUP_HOME = "D:\DevTools\Rust\rustup"
$env:LIBCLANG_PATH = "D:\DevTools\LLVM\bin"
$env:CMAKE = "D:\DevTools\CMake\bin\cmake.exe"
$env:PATH = "D:\DevTools\Rust\cargo\bin;D:\DevTools\CMake\bin;$env:PATH"

Write-Host "[Build] Starting Tauri build..."
bun install
bun run tauri build
