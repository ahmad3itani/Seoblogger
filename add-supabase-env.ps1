$envPath = "c:\Users\ahmad\Desktop\BloggerSEO\.env"
$content = Get-Content $envPath -Raw

# Add Supabase environment variables if they don't exist
if ($content -notmatch 'NEXT_PUBLIC_SUPABASE_URL=') {
    $content += "`r`n`r`n# Supabase"
    $content += "`r`nNEXT_PUBLIC_SUPABASE_URL=https://pjeaoylvgomnmzuwbwcu.supabase.co"
    $content += "`r`nNEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here"
}

Set-Content $envPath -Value $content -NoNewline
Write-Host "Added Supabase environment variables to .env"
