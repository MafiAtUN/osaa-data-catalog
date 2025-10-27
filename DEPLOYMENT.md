# Deployment Guide for UN OSAA Data Catalog

This guide explains how to deploy the UN OSAA Data Catalog to GitHub Pages.

## Prerequisites

- A GitHub account
- Basic knowledge of Git and GitHub

## Deployment Steps

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "New repository" or go to https://github.com/new
3. Name your repository: `un-osaa-data-catalog`
4. Make it public (required for GitHub Pages)
5. Don't initialize with README (we already have one)
6. Click "Create repository"

### 2. Upload Files to GitHub

#### Option A: Using GitHub Web Interface
1. Go to your new repository
2. Click "uploading an existing file"
3. Drag and drop all files from this project:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `data.js`
   - `README.md`
   - `_config.yml`
   - `.gitignore`
4. Add a commit message: "Initial commit: UN OSAA Data Catalog"
5. Click "Commit changes"

#### Option B: Using Git Command Line
```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: UN OSAA Data Catalog"

# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/un-osaa-data-catalog.git

# Push to GitHub
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click "Save"
7. Wait a few minutes for GitHub to build and deploy your site

### 4. Access Your Data Catalog

1. Your data catalog will be available at:
   `https://YOUR_USERNAME.github.io/un-osaa-data-catalog`
2. You can also find this URL in the "Pages" section of your repository settings

## Customization

### Updating Data
To add or modify indicators:
1. Edit the `data.js` file
2. Commit and push changes to GitHub
3. GitHub Pages will automatically update

### Custom Domain (Optional)
If you have a custom domain:
1. Add a `CNAME` file with your domain name
2. Configure DNS settings with your domain provider
3. Update the `url` in `_config.yml`

## Maintenance

### Regular Updates
- Monitor data sources for updates
- Add new indicators as they become available
- Update metadata when methodologies change
- Review and update remarks for accuracy

### Community Contributions
- Enable issues in repository settings
- Create contribution guidelines
- Review pull requests from contributors
- Maintain data quality standards

## Troubleshooting

### Common Issues

1. **Site not loading**: Check that all files are in the root directory
2. **Styling issues**: Ensure `styles.css` is properly linked
3. **JavaScript errors**: Check browser console for errors
4. **Data not loading**: Verify `data.js` is accessible

### Getting Help

- Check GitHub Pages documentation
- Review browser console for errors
- Test locally by opening `index.html` in a browser
- Create an issue in the repository for bugs

## Security Considerations

- All data is publicly accessible
- No sensitive information should be included
- Source URLs should be from reputable organizations
- Regular security updates recommended

## Performance Optimization

- Images should be optimized for web
- Consider using a CDN for better performance
- Monitor page load times
- Compress CSS and JavaScript if needed

---

For additional support, please refer to the main README.md file or create an issue in the repository.
