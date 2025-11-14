# Hướng dẫn cài đặt Foundry trên Windows

## Cách 1: Sử dụng foundryup (Khuyến nghị)

### Bước 1: Cài đặt foundryup

Mở PowerShell và chạy:

```powershell
# Tải và chạy foundryup installer
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_x86_64-pc-windows-msvc.tar.gz -OutFile foundry.tar.gz

# Hoặc sử dụng foundryup (cách đơn giản hơn)
```

Hoặc tải trực tiếp từ: https://github.com/foundry-rs/foundry/releases

### Bước 2: Cài đặt qua foundryup (Windows với Git Bash hoặc WSL)

Nếu bạn có Git Bash hoặc WSL:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Bước 3: Cài đặt thủ công (Windows PowerShell)

1. Tải file release từ: https://github.com/foundry-rs/foundry/releases/latest
2. Giải nén vào thư mục (ví dụ: `C:\foundry`)
3. Thêm vào PATH:
   - Mở "Environment Variables"
   - Thêm `C:\foundry` vào PATH

## Cách 2: Sử dụng Chocolatey (Nếu đã cài Chocolatey)

```powershell
choco install foundry
```

## Cách 3: Sử dụng Scoop (Nếu đã cài Scoop)

```powershell
scoop bucket add main
scoop install foundry
```

## Kiểm tra cài đặt

Sau khi cài đặt, mở PowerShell mới và chạy:

```powershell
forge --version
cast --version
anvil --version
```

## Xử lý lỗi

Nếu vẫn gặp lỗi "forge is not recognized":
1. Đóng và mở lại PowerShell/Terminal
2. Kiểm tra PATH có chứa thư mục foundry
3. Restart máy tính nếu cần


