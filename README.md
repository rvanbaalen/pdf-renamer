# pdf-renamer
Basic batch file that reads the contents of an invoice PDF and renames the file accordingly.
When downloading invoices from multiple sources, the file names are a mess.
This script will read the contents of the PDF and rename the file to a more human-readable format:

`yyyy-mm-dd - {Company name} - Invoice {invoice number}.pdf` 

Where `yyyy-mm-dd` is the date of the invoice, `{Company name}` is the name of the company that issued the invoice, 
and `{invoice number}` is the invoice number.

## Install

```bash
chmod +x ./install.sh

# This will chmod & symlink the script to /usr/local/bin/pdf-renamer and /usr/local/bin/rename-pdf
./install.sh
```

## Usage

### Single file
```bash
pdf-renamer /path/to/invoice.pdf
```

### Multiple files
```bash
# Renames all PDF files in the current directory
pdf-renamer . 

# Renames all PDF files in the specified directory
pdf-renamer /path/to/directory
```
