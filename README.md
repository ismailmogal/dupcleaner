# OneDrive Duplicate Finder

A powerful web application for finding and managing duplicate files across OneDrive folders using Microsoft Graph API.

## 🚀 Features

- **🔐 Secure Authentication**: Microsoft Identity Platform integration
- **📁 Multi-Folder Comparison**: Compare duplicates across multiple folders
- **🔍 Smart Detection**: Multiple duplicate detection methods (exact, similar, size, hash)
- **🎯 Smart Selection**: Auto-select duplicates to keep (newest, oldest, largest, smallest)
- **📊 Advanced Filtering**: Filter by folder, size, and date
- **📈 Sortable Interface**: Sort files by any property
- **🎨 Modern UI**: Dark/light themes with responsive design
- **💾 Persistent Settings**: Remembers your preferences and folder selections
- **📱 Mobile Friendly**: Works on all devices

## 🛠️ Prerequisites

- Node.js (v16 or higher)
- Microsoft Azure account
- OneDrive account with files to analyze

## ⚙️ Setup

### 1. Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
2. Click "New registration"
3. Configure your app:
   - **Name**: "OneDrive Duplicate Finder"
   - **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: 
     - Development: `http://localhost:3000`
     - Production: `https://yourdomain.com`
4. Note down the **Application (client) ID**

### 2. Configure API Permissions

1. Go to "API permissions" in your app registration
2. Click "Add a permission" > "Microsoft Graph" > "Delegated permissions"
3. Add these permissions:
   - `Files.Read`
   - `Files.ReadWrite`
   - `User.Read`
   - `offline_access`
4. Click "Grant admin consent"

### 3. Environment Configuration

Create a `.env` file in the client directory:

```env
REACT_APP_CLIENT_ID=your_client_id_here
REACT_APP_TENANT_ID=common
REACT_APP_REDIRECT_URI=http://localhost:3000
```

### 4. Install Dependencies

```bash
cd client
npm install
```

## 🚀 Development

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🏗️ Production Build

```bash
npm run build
```

The build folder contains the production-ready files.

## 📦 Deployment

### Option 1: Static Hosting (Recommended)

Deploy to any static hosting service:

- **Netlify**: Drag and drop the `build` folder
- **Vercel**: Connect your GitHub repository
- **Azure Static Web Apps**: Use Azure CLI
- **GitHub Pages**: Use `gh-pages` package

### Option 2: Docker

```dockerfile
FROM nginx:alpine
COPY build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Option 3: Traditional Web Server

Copy the `build` folder contents to your web server's document root.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_CLIENT_ID` | Azure App Client ID | Yes |
| `REACT_APP_TENANT_ID` | Azure Tenant ID (use "common" for multi-tenant) | Yes |
| `REACT_APP_REDIRECT_URI` | App redirect URI | Yes |

### Production Checklist

- [ ] Update redirect URI in Azure app registration
- [ ] Set environment variables for production
- [ ] Test authentication flow
- [ ] Verify file operations work
- [ ] Check mobile responsiveness
- [ ] Test error handling

## 🛡️ Security

- **OAuth 2.0**: Secure authentication flow
- **Token Management**: Automatic token refresh
- **No Server**: Client-side only, no sensitive data stored
- **HTTPS Required**: Always use HTTPS in production

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify client ID and redirect URI
   - Check API permissions in Azure
   - Ensure HTTPS in production

2. **File Access Issues**
   - Verify user has OneDrive access
   - Check API permissions are granted

3. **Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review Azure app configuration
- Ensure all prerequisites are met 