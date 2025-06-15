# Backend Test Script
Write-Host "🧪 BookMate Backend Test Suite" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

$baseUrl = "http://192.168.30.4:5000"

# Test 1: Ana endpoint
Write-Host "`n1. Testing main endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -Method GET
    Write-Host "✅ Main endpoint: OK" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Main endpoint: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Test endpoint
Write-Host "`n2. Testing test endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/test-endpoint" -Method GET
    Write-Host "✅ Test endpoint: OK" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Test endpoint: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Username check - available
Write-Host "`n3. Testing username check (available)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/check-username/samet" -Method GET
    Write-Host "✅ Username check (available): OK" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Username check (available): FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Username check - reserved
Write-Host "`n4. Testing username check (reserved)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/check-username/admin" -Method GET
    Write-Host "✅ Username check (reserved): OK" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Username check (reserved): FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Register endpoint
Write-Host "`n5. Testing register endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        email = "test@example.com"
        password = "123456"
        displayName = "Test User"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Register endpoint: OK" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Register endpoint: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

# Test 6: Login endpoint
Write-Host "`n6. Testing login endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        email = "test@example.com"
        password = "123456"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Login endpoint: OK" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
    
    # Token'ı çıkar
    $loginData = $response.Content | ConvertFrom-Json
    $global:token = $loginData.token
    Write-Host "Token saved for authenticated tests" -ForegroundColor Green
} catch {
    Write-Host "❌ Login endpoint: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

# Test 7: Authenticated endpoint (/api/auth/me)
Write-Host "`n7. Testing authenticated endpoint (/api/auth/me)..." -ForegroundColor Yellow
if ($global:token) {
    try {
        $headers = @{
            "Authorization" = "Bearer $($global:token)"
        }
        $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers
        Write-Host "✅ Authenticated endpoint: OK" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Authenticated endpoint: FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Skipping authenticated test - no token available" -ForegroundColor Yellow
}

# Test 8: 404 endpoint
Write-Host "`n8. Testing 404 endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/nonexistent" -Method GET
    Write-Host "❌ 404 test: FAILED (should have returned 404)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ 404 endpoint: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ 404 endpoint: FAILED (wrong status code)" -ForegroundColor Red
    }
}

Write-Host "`n🏁 Test Suite Completed!" -ForegroundColor Green 