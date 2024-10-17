#!/bin/bash

# Check if Homebrew is installed
if ! command -v brew &> /dev/null
then
    echo "Homebrew is not installed. Please install Homebrew and try again."
    exit 1
fi

# Check if pdftotext is installed
if ! command -v pdftotext &> /dev/null
then
    echo "pdftotext is not installed."
    echo "You can install it using Homebrew by running the following command:"
    echo "brew install poppler"
    exit 1
fi

# Get the current working directory
current_dir=$(pwd)

# Make pdf-renamer.sh executable
chmod +x "$current_dir/pdf-renamer.sh"

# Symlink pdf-renamer.sh to /usr/local/bin/pdf-renamer
sudo ln -sf "$current_dir/pdf-renamer.sh" /usr/local/bin/pdf-renamer

# Symlink pdf-renamer.sh to /usr/local/bin/rename-pdf
sudo ln -sf "$current_dir/pdf-renamer.sh" /usr/local/bin/rename-pdf

# Verify symlinks creation
if [ -L /usr/local/bin/pdf-renamer ] && [ -L /usr/local/bin/rename-pdf ]; then
    echo "pdf-renamer and rename-pdf are symlinked successfully!"
else
    echo "There was an issue creating the symlinks."
    exit 1
fi
