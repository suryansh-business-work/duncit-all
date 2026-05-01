Add-Type -AssemblyName System.Drawing
$dir = "$PSScriptRoot"
$sizes = 192,512
foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $p1 = New-Object System.Drawing.Point(0,0)
  $p2 = New-Object System.Drawing.Point($s,$s)
  $c1 = [System.Drawing.Color]::FromArgb(59,130,246)
  $c2 = [System.Drawing.Color]::FromArgb(29,78,216)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($p1,$p2,$c1,$c2)
  $rect = New-Object System.Drawing.Rectangle(0,0,$s,$s)
  $g.FillRectangle($brush,$rect)
  $font = New-Object System.Drawing.Font('Segoe UI',[int]($s*0.55),[System.Drawing.FontStyle]::Bold)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'
  $textRect = New-Object System.Drawing.RectangleF(0,0,$s,$s)
  $g.DrawString('D',$font,[System.Drawing.Brushes]::White,$textRect,$sf)
  $bmp.Save((Join-Path $dir "icon-$s.png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
Write-Host "Done"
