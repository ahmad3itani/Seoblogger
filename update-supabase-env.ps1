$envPath = "c:\Users\ahmad\Desktop\BloggerSEO\.env"
$content = Get-Content $envPath -Raw

# Add Supabase environment variables
if ($content -notmatch 'NEXT_PUBLIC_SUPABASE_URL=') {
    $content += "`r`n`r`n# Supabase"
    $content += "`r`nNEXT_PUBLIC_SUPABASE_URL=https://pjeaoylvgomnmzuwbwcu.supabase.co"
    $content += "`r`nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZWFveWx2Z29tbm16dXdid2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODg1MzAsImV4cCI6MjA4ODY2NDUzMH0.Qi6nsts0LKZ66pd-ZbYvFGBluOQjMb3Wq6ntEwGMums"
}

Set-Content $envPath -Value $content -NoNewline
Write-Host "Updated .env with Supabase credentials"
