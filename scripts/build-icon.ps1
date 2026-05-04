# Genera buildResources/icon.png (512x512) e icon.ico (multi-res 16/32/48/64/128/256)
# para Nora OS. Usa System.Drawing (Windows nativo, sin dependencias npm extra).
#
# Diseno:
#   - Fondo gradiente diagonal cosmic-purple (paleta oficial Nora OS)
#   - Borde redondeado con halo color acento violeta
#   - Isotipo Nora oficial (identidadVisual-noraOS/nora-isotipo-original.png)
#     centrado, con sombra sutil para tamaños grandes.
#
# Uso: pwsh ./scripts/build-icon.ps1
# Salida: buildResources/icon.png + buildResources/icon.ico

[CmdletBinding()]
param(
    [string]$OutDir,
    [string]$IsotipoPath
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root = if ($PSScriptRoot -and $PSScriptRoot.Trim() -ne '') { $PSScriptRoot } else { (Get-Location).Path }
if (-not $OutDir -or $OutDir.Trim() -eq '') {
    $OutDir = Join-Path $root '..\buildResources'
}
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path

# Fuente del isotipo: kit de identidad oficial.
if (-not $IsotipoPath -or $IsotipoPath.Trim() -eq '') {
    $IsotipoPath = Join-Path $root '..\identidadVisual-noraOS\nora-isotipo-original.png'
}
if (-not (Test-Path $IsotipoPath)) {
    throw "No se encontró el isotipo Nora en: $IsotipoPath"
}
$IsotipoPath = (Resolve-Path $IsotipoPath).Path

# Paleta cosmic-purple (coherente con AuthScreen y splash).
$bgTop    = [System.Drawing.Color]::FromArgb(255,  29,  14,  61)   # #1d0e3d
$bgBot    = [System.Drawing.Color]::FromArgb(255,   7,   6,  13)   # #07060d
$accent   = [System.Drawing.Color]::FromArgb(140, 138,  92, 246)   # violet-500 alpha
$accentSo = [System.Drawing.Color]::FromArgb(120, 138,  92, 246)

# Cargar isotipo una sola vez en memoria.
$isotipoBmp = [System.Drawing.Image]::FromFile($IsotipoPath)

function New-IconBitmap {
    param([int]$Size)

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Path con esquinas redondeadas
    $radius = [int]($Size * 0.22)
    $rect   = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
    $path   = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d      = $radius * 2
    $path.AddArc($rect.X,                   $rect.Y,                   $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d,          $rect.Y,                   $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d,          $rect.Bottom - $d,         $d, $d,   0, 90)
    $path.AddArc($rect.X,                   $rect.Bottom - $d,         $d, $d,  90, 90)
    $path.CloseFigure()

    # Fondo gradiente
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF 0, 0),
        (New-Object System.Drawing.PointF $Size, $Size),
        $bgTop, $bgBot)
    $g.FillPath($grad, $path)
    $grad.Dispose()

    # Halo acento (rectangulo interno con borde violeta semi)
    $haloPad = [Math]::Max(2, [int]($Size * 0.06))
    $haloRect = New-Object System.Drawing.Rectangle $haloPad, $haloPad, ($Size - 2*$haloPad), ($Size - 2*$haloPad)
    $haloR   = [int]($radius * 0.85)
    $haloPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $hd = $haloR * 2
    $haloPath.AddArc($haloRect.X,                   $haloRect.Y,                   $hd, $hd, 180, 90)
    $haloPath.AddArc($haloRect.Right - $hd,         $haloRect.Y,                   $hd, $hd, 270, 90)
    $haloPath.AddArc($haloRect.Right - $hd,         $haloRect.Bottom - $hd,        $hd, $hd,   0, 90)
    $haloPath.AddArc($haloRect.X,                   $haloRect.Bottom - $hd,        $hd, $hd,  90, 90)
    $haloPath.CloseFigure()
    $haloPen = New-Object System.Drawing.Pen $accentSo, ([Math]::Max(1, $Size / 64))
    $g.DrawPath($haloPen, $haloPath)
    $haloPen.Dispose()
    $haloPath.Dispose()

    # Isotipo centrado: ocupa ~62% del canvas, conservando aspect ratio.
    $targetSize = [int]($Size * 0.62)
    $srcW = [single]$isotipoBmp.Width
    $srcH = [single]$isotipoBmp.Height
    $scale = [single]$targetSize / [single]([Math]::Max($srcW, $srcH))
    $drawW = [int]($srcW * $scale)
    $drawH = [int]($srcH * $scale)
    $drawX = [int](($Size - $drawW) / 2)
    $drawY = [int](($Size - $drawH) / 2)
    $destRect = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawW, $drawH

    # Sombra sutil sólo en tamaños grandes (apenas perceptible).
    if ($Size -ge 64) {
        $shadowOffset = [Math]::Max(1, [int]($Size * 0.012))
        $shadowRect = New-Object System.Drawing.Rectangle ($drawX + $shadowOffset), ($drawY + $shadowOffset), $drawW, $drawH
        # Atributos para teñir la sombra (alpha 30%) reusando la misma imagen.
        $matrix = New-Object 'single[][]' 5
        for ($i = 0; $i -lt 5; $i++) { $matrix[$i] = New-Object 'single[]' 5 }
        # Anula RGB y deja alpha al 30%.
        $matrix[3][3] = 0.30
        $colorMatrix = New-Object System.Drawing.Imaging.ColorMatrix (,$matrix)
        $attrs = New-Object System.Drawing.Imaging.ImageAttributes
        $attrs.SetColorMatrix($colorMatrix)
        $g.DrawImage($isotipoBmp, $shadowRect, 0, 0, [int]$srcW, [int]$srcH,
            [System.Drawing.GraphicsUnit]::Pixel, $attrs)
        $attrs.Dispose()
    }

    # Isotipo principal
    $g.DrawImage($isotipoBmp, $destRect)

    $g.Dispose()
    $path.Dispose()
    return $bmp
}

# 1) PNG 512x512
$pngPath = Join-Path $OutDir 'icon.png'
$png = New-IconBitmap -Size 512
$png.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$png.Dispose()
Write-Host "PNG  -> $pngPath"

# 2) ICO multi-res. Cada entrada lleva un PNG embebido (formato Vista+).
$icoPath = Join-Path $OutDir 'icon.ico'
$sizes   = @(16, 32, 48, 64, 128, 256)
$bitmaps = @()
$pngBlobs = @()

foreach ($s in $sizes) {
    $b = New-IconBitmap -Size $s
    $bitmaps += $b
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBlobs += ,($ms.ToArray())
    $ms.Dispose()
}

$fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$bw = New-Object System.IO.BinaryWriter $fs
try {
    # ICONDIR
    $bw.Write([UInt16]0)                 # reserved
    $bw.Write([UInt16]1)                 # type = 1 (icon)
    $bw.Write([UInt16]$sizes.Count)      # count

    $headerSize = 6 + (16 * $sizes.Count)
    $offset = $headerSize

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s    = $sizes[$i]
        $blob = $pngBlobs[$i]
        $w    = if ($s -ge 256) { 0 } else { $s }
        $h    = if ($s -ge 256) { 0 } else { $s }
        $bw.Write([byte]$w)              # width
        $bw.Write([byte]$h)              # height
        $bw.Write([byte]0)               # colors
        $bw.Write([byte]0)               # reserved
        $bw.Write([UInt16]1)             # planes
        $bw.Write([UInt16]32)            # bpp
        $bw.Write([UInt32]$blob.Length)  # bytes in resource
        $bw.Write([UInt32]$offset)       # offset
        $offset += $blob.Length
    }

    foreach ($blob in $pngBlobs) {
        $bw.Write($blob)
    }
} finally {
    $bw.Dispose()
    $fs.Dispose()
}
foreach ($b in $bitmaps) { $b.Dispose() }
$isotipoBmp.Dispose()
Write-Host "ICO  -> $icoPath"

Write-Host "Done."
