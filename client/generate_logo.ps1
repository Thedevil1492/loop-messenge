Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 1024, 1024
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$bg = [System.Drawing.ColorTranslator]::FromHtml('#0f172a')
$g.Clear($bg)

$rect = New-Object System.Drawing.Rectangle 0, 0, 1024, 1024
$linGrBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.ColorTranslator]::FromHtml('#2b5bf4'),
    [System.Drawing.ColorTranslator]::FromHtml('#06b6d4'),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)

$pen = New-Object System.Drawing.Pen $linGrBrush, 55
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$p1 = New-Object System.Drawing.Point 320, 380
$p2 = New-Object System.Drawing.Point 180, 500
$p3 = New-Object System.Drawing.Point 340, 640
$p4 = New-Object System.Drawing.Point 560, 460
$p5 = New-Object System.Drawing.Point 740, 360
$p6 = New-Object System.Drawing.Point 860, 500
$p7 = New-Object System.Drawing.Point 700, 640
$p8 = New-Object System.Drawing.Point 500, 480

[System.Drawing.Point[]]$points = @($p1, $p2, $p3, $p4, $p5, $p6, $p7, $p8)
$g.DrawClosedCurve($pen, $points, 0.5, [System.Drawing.Drawing2D.FillMode]::Winding)

$cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#22d3ee'))
$g.FillEllipse($cyanBrush, 680, 480, 45, 45)

New-Item -ItemType Directory -Path "D:\REA\assets" -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -ItemType Directory -Path "D:\REA\app\client\assets" -Force -ErrorAction SilentlyContinue | Out-Null

$bmp.Save("D:\REA\assets\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("D:\REA\app\client\assets\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("D:\REA\app\client\assets\icon-only.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("D:\REA\app\client\assets\icon-foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("D:\REA\app\client\assets\icon-background.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("D:\REA\app\client\assets\splash.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Host "Generated logo.png and assets successfully"
