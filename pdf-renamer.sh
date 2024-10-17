#!/bin/bash

# Check if an input file or folder is provided by Automator
if [ $# -eq 0 ]; then
    echo "No input provided. Exiting."
    exit 1
fi

# Loop through each item passed by Automator
for input_item in "$@"; do
    if [ -d "$input_item" ]; then
        echo "Processing all PDF files in the folder: $input_item"
        find "$input_item" -name "*.pdf" -type f -exec "$0" {} \; # Execute the script for each PDF found in the folder
    elif [[ "$input_item" == *.pdf ]]; then
        echo "---"
        echo "Processing PDF file: $input_item"
        # Place your processing logic for individual PDF files here
    else
        echo "$input_item is not a PDF file or a folder."
    fi
done

input_file="$1"

# Check if the file already has the correct prefix
# if [[ $(basename "$input_file") =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\ -\  ]]; then
#     echo "Skipped: '$(basename "$input_file")' already has the correct prefix."
#     exit 0
# fi

# Function to sanitize individual parts of the filename
sanitize_part() {
    echo "$1" | sed 's/[\/:*?"<>|]/_/g'
}

# Function to extract invoice date from LanguageTooler PDF
extract_languagetooler_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Billed On" | sed 's/.*Billed On *//g' | xargs
}

# Function to extract invoice number from LanguageTooler PDF
extract_languagetooler_invoice_number() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice #" | sed 's/.*Invoice # *//g' | xargs
}

# Function to extract company name from LanguageTooler PDF
extract_languagetooler_company_name() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "^LanguageTooler" | awk -F' ' '{print $1, $2}' | xargs
}

# Function to extract invoice date from Udemy PDF
extract_udemy_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice date:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice number from Udemy PDF
extract_udemy_invoice_number() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice #:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract company name from Help Scout PDF
extract_helpscout_company_name() {
    echo "Help Scout"
}

# Function to extract invoice date from Help Scout PDF
extract_helpscout_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice Date:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice number from Help Scout PDF
extract_helpscout_invoice_number() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice No.:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract company name from Paddle PDF
extract_paddle_company_name() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | awk '/Invoice to:/{getline; getline; print}' | sed 's/[[:space:]]\{2,\}.*//' | xargs
}

# Function to extract date from Paddle PDF
extract_paddle_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice Date:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice number from Paddle PDF
extract_paddle_invoice_number() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice Number:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract date from Namecheap PDF
extract_namecheap_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Order Date" | awk -F': ' '{print $2}' | awk '{print $1}' | xargs
}

# Function to extract date from DigitalOcean PDF
extract_digitalocean_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Date of issue:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice details from DigitalOcean PDF
extract_digitalocean_invoice_details() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice number:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice details from Forge PDF
extract_forge_invoice_details() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice Number:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice details from Google Workspace PDF
extract_google_workspace_invoice_details() {
    /opt/homebrew/bin/pdftotext -q "$1" - | grep -m 1 "Invoice number:" | awk -F': ' '{print $2}' | awk '{print $1}' | xargs
}

# Function to extract date from Forge PDF
extract_forge_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Date:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract date from GitHub PDF
extract_github_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "^Date" | awk '{print $2}' | xargs
}

# Function to extract date from Google Workspace PDF
extract_google_workspace_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep -i "invoice *date" | awk -F 'date' '{print $2}' | awk '{print $1, $2, $3}' | xargs
}

# Function to extract invoice number from Stripe PDF
extract_stripe_invoice_number() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Invoice number" | awk -F' ' '{print $3}' | xargs
}
# Function to extract company name from Stripe PDF
extract_stripe_company_name() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep -A 3 "Date due" | tail -n 1 | sed 's/[[:space:]]\{2,\}.*//' | xargs
}
# Function to extract date from Stripe PDF
extract_stripe_date() {
    /opt/homebrew/bin/pdftotext -q -layout "$1" - | grep "Date due" | awk -F' ' '{print $3, $4, $5}' | xargs
}



# Function to extract date from PayPal PDF
extract_paypal_date() {
    /opt/homebrew/bin/pdftotext -q "$1" - | sed -n '9p' | awk '{print $1, $2, $3}' | xargs
}

# Function to extract prefix from PayPal PDF
extract_paypal_prefix() {
    /opt/homebrew/bin/pdftotext -q "$1" - | sed -n '5p' | xargs
}

# Updated function to extract invoice details from PayPal PDF
extract_paypal_invoice_details() {
    local content=$(/opt/homebrew/bin/pdftotext -q "$1" -)
    if echo "$content" | grep -q "Purchase details"; then
        echo "$content" |
        awk '/Purchase details/{flag=1; next} /^$/{flag=0} flag' |
        sed 's/\[.*\]//g' |
        tr -s ' ' |
        tr '\n' ' ' |
        sed 's/^ *//; s/ *$//' |
        xargs
    else
        echo "$content" |
        awk '/Details/{flag=1; next} /^$/{flag=0} flag' |
        sed 's/\[.*\]//g' |
        tr -s ' ' |
        tr '\n' ' ' |
        sed 's/^ *//; s/ *$//' |
        xargs
    fi
}

# Function to extract date from Bol.com PDF
extract_bolcom_date() {
    /opt/homebrew/bin/pdftotext -q "$1" - | grep "Factuurdatum:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice details from Bol.com PDF
extract_bolcom_invoice_details() {
    /opt/homebrew/bin/pdftotext -q "$1" - | awk '/Prijs\/st/{flag=1; next} /Bedankt voor je aankoop bij bol/{exit} flag && NF>1 {print $0}' | tail -1 | xargs
}

# Function to convert Dutch month names to numbers
dutch_month_to_number() {
    case $1 in
        januari)   echo "01" ;;
        februari)  echo "02" ;;
        maart)     echo "03" ;;
        april)     echo "04" ;;
        mei)       echo "05" ;;
        juni)      echo "06" ;;
        juli)      echo "07" ;;
        augustus)  echo "08" ;;
        september) echo "09" ;;
        oktober)   echo "10" ;;
        november)  echo "11" ;;
        december)  echo "12" ;;
    esac
}

# Function to extract date from Uptime Robot PDF
extract_uptimerobot_date() {
    /opt/homebrew/bin/pdftotext -q "$1" - | sed -n '9p' | xargs
}

# Function to extract invoice details from Uptime Robot PDF
extract_uptimerobot_invoice_details() {
    /opt/homebrew/bin/pdftotext -q "$1" - | sed -n '1p' | xargs
}

# Function to extract date from Amazon PDF
extract_amazon_date() {
    /opt/homebrew/bin/pdftotext -q "$1" - | grep "Order Placed:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice details from Amazon PDF
extract_amazon_invoice_details() {
    content=$(/opt/homebrew/bin/pdftotext -q "$1" -)
    if echo "$content" | grep -q "E-mail gift card to:" && echo "$content" | grep -q "Item(s) Subtotal:"; then
        echo "Apple Account topup"
    else
        echo "Order $(echo "$content" | grep "Amazon.com order number:" | awk -F': ' '{print $2}')"
    fi
}

# Function to extract date from Postmark PDF
extract_postmark_date() {
    /opt/homebrew/bin/pdftotext -q "$1" - | grep "Invoice date:" | awk -F': ' '{print $2}' | xargs
}

# Function to extract invoice details from Postmark PDF
extract_postmark_invoice_details() {
    /opt/homebrew/bin/pdftotext -q "$1" - | grep "Receipt #" | head -n 1 | sed 's/^.*Receipt #/Receipt /' | xargs
}

# Function to extract date from OpenAI PDF
extract_openai_date() {
    /opt/homebrew/bin/pdftotext -q "$1" - | awk '/Date of issue/{getline; print}' | xargs
}

# Function to extract invoice details from OpenAI PDF
extract_openai_invoice_details() {
    /opt/homebrew/bin/pdftotext -q "$1" - | grep "Invoice number" | sed 's/Invoice number/Invoice/' | xargs
}

# Extract content and determine PDF type
content=$(/opt/homebrew/bin/pdftotext -q "$input_file" -)

# Switch-like statement to handle different PDF types
if echo "$content" | grep -q "www.namecheap.com"; then
    pdf_type="namecheap"
    extracted_date=$(extract_namecheap_date "$input_file")
    date_format="%m/%d/%Y"
    new_filename_prefix=""
elif echo "$content" | grep -q "LanguageTooler"; then
    pdf_type="languagetooler"
    extracted_date=$(extract_languagetooler_date "$input_file")
    date_format="%d %b %Y"
    new_filename_prefix="$(extract_languagetooler_company_name "$input_file") - "
    invoice_number=$(extract_languagetooler_invoice_number "$input_file")
    invoice_details="Invoice $invoice_number"
elif echo "$content" | grep -q "Udemy"; then
    pdf_type="udemy"
    extracted_date=$(extract_udemy_date "$input_file")
    date_format="%m/%d/%y"
    new_filename_prefix="Udemy - "
    invoice_number=$(extract_udemy_invoice_number "$input_file")
    invoice_details="Invoice $invoice_number"
elif echo "$content" | grep -q "buildui.com"; then
    pdf_type="stripe"
    extracted_date=$(extract_stripe_date "$input_file") # Correct date extraction for Stripe
    date_format="%B %d, %Y" # Stripe date format
    invoice_number=$(extract_stripe_invoice_number "$input_file")
    company_name=$(extract_stripe_company_name "$input_file")
    new_filename_prefix="$company_name - "
    invoice_details="Invoice $invoice_number"
elif echo "$content" | grep -q "Paddle.com"; then
    pdf_type="paddle"
    extracted_date=$(extract_paddle_date "$input_file")
    date_format="%d %b %Y"
    new_filename_prefix="$(extract_paddle_company_name "$input_file") - "
    invoice_number=$(extract_paddle_invoice_number "$input_file")
    invoice_details="Invoice $invoice_number"
elif echo "$content" | grep -q "OpenAI, LLC"; then
    pdf_type="openai"
    extracted_date=$(extract_openai_date "$input_file")
    date_format="%B %d, %Y"
    new_filename_prefix="Open AI - "
    invoice_details=$(extract_openai_invoice_details "$input_file")
elif echo "$content" | grep -q "postmarkapp.com"; then
    pdf_type="postmark"
    extracted_date=$(extract_postmark_date "$input_file")
    date_format="%B %d, %Y"
    new_filename_prefix="Postmark - "
    invoice_details=$(extract_postmark_invoice_details "$input_file")
elif echo "$content" | grep -q "DigitalOcean LLC"; then
    pdf_type="digitalocean"
    extracted_date=$(extract_digitalocean_date "$input_file")
    date_format="%B %d, %Y"
    new_filename_prefix="DigitalOcean - "
    invoice_number=$(extract_digitalocean_invoice_details "$input_file")
    invoice_details="Invoice $invoice_number"
elif echo "$content" | grep -q "Product: Forge"; then
    pdf_type="forge"
    extracted_date=$(extract_forge_date "$input_file")
    invoice_number=$(extract_forge_invoice_details "$input_file")
    date_format="%b %d, %Y"
    new_filename_prefix="Laravel Forge - "
    invoice_details="Invoice $invoice_number"
elif echo "$content" | grep -q "GitHub, Inc."; then
    pdf_type="github"
    extracted_date=$(extract_github_date "$input_file")
    date_format="%Y-%m-%d"
    new_filename_prefix="GitHub - "
elif echo "$content" | grep -qE "Google Cloud EMEA Limited|Google LLC"; then
    pdf_type="google_workspace"
    extracted_date=$(extract_google_workspace_date "$input_file")
    date_format="%b %d, %Y"
    new_filename_prefix="Google Workspace - "
    invoice_details="Invoice $(extract_google_workspace_invoice_details "$input_file")"
elif echo "$content" | grep -q "PayPal: Activities"; then
    pdf_type="paypal"
    extracted_date=$(extract_paypal_date "$input_file")
    date_format="%d %B %Y"
    new_filename_prefix="$(extract_paypal_prefix "$input_file") - "
    invoice_details=$(extract_paypal_invoice_details "$input_file")
elif echo "$content" | grep -q "bol.com"; then
    pdf_type="bolcom"
    dutch_date=$(extract_bolcom_date "$input_file")
    day=$(echo $dutch_date | awk '{print $1}')
    month=$(echo $dutch_date | awk '{print $2}')
    year=$(echo $dutch_date | awk '{print $3}')
    month_num=$(dutch_month_to_number $month)
    extracted_date="${year}-${month_num}-${day}"
    date_format="%Y-%m-%d"
    new_filename_prefix="Bol.com - "
    invoice_details=$(extract_bolcom_invoice_details "$input_file")
elif echo "$content" | grep -q "Uptime Robot"; then
    pdf_type="uptimerobot"
    extracted_date=$(extract_uptimerobot_date "$input_file")
    date_format="%B %d, %Y"
    new_filename_prefix="Uptime Robot - "
    invoice_details=$(extract_uptimerobot_invoice_details "$input_file")
elif echo "$content" | grep -q "Amazon.com"; then
    pdf_type="amazon"
    extracted_date=$(extract_amazon_date "$input_file")
    date_format="%B %d, %Y"
    new_filename_prefix="Amazon.com - "
    invoice_details=$(extract_amazon_invoice_details "$input_file")
elif echo "$content" | grep -q "Help Scout"; then
    pdf_type="helpscout"
    extracted_date=$(extract_helpscout_date "$input_file")
    date_format="%B %d, %Y"
    new_filename_prefix="$(extract_helpscout_company_name "$input_file") - "
    invoice_number=$(extract_helpscout_invoice_number "$input_file")
    invoice_details="Invoice $invoice_number"
else
    echo "> Error: Unable to recognize PDF type."
    exit 1
fi

# Convert date format
if [ "$pdf_type" != "bolcom" ]; then
    converted_date=$(date -j -f "$date_format" "$extracted_date" "+%Y-%m-%d" 2>/dev/null)
else
    converted_date=$extracted_date
fi

if [ -z "$converted_date" ]; then
    echo "> Failed to convert date. Please ensure the date in the PDF is in the correct format."
    exit 1
fi

# Prepare new filename
filename=$(basename "$input_file")

# Sanitize the new filename parts
sanitized_prefix=$(sanitize_part "$new_filename_prefix")
sanitized_invoice_details=$(sanitize_part "$invoice_details")
sanitized_filename=$(sanitize_part "$filename")

# Prepare new filename
if [ "$pdf_type" = "paypal" ] || [ "$pdf_type" = "languagetooler" ] || [ "$pdf_type" = "udemy" ] || [ "$pdf_type" = "helpscout" ] || [ "$pdf_type" = "bolcom" ] || [ "$pdf_type" = "uptimerobot" ] || [ "$pdf_type" = "paddle" ] || [ "$pdf_type" = "amazon" ] || [ "$pdf_type" = "postmark" ] || [ "$pdf_type" = "openai" ] || [ "$pdf_type" = "digitalocean" ] || [ "$pdf_type" = "forge" ] || [ "$pdf_type" = "google_workspace" ] || [ "$pdf_type" = "stripe" ]; then
    new_filename="${converted_date} - ${sanitized_prefix}${sanitized_invoice_details}.pdf"
elif [[ $filename =~ ^github-.*-receipt-[0-9]{4}-[0-9]{2}-[0-9]{2}\.pdf$ ]]; then
    middle_part=$(echo "$filename" | sed -E 's/^github-(.*)-receipt-[0-9]{4}-[0-9]{2}-[0-9]{2}\.pdf$/\1/')
    sanitized_middle_part=$(sanitize_part "$middle_part")
    new_filename="${converted_date} - ${sanitized_prefix}${sanitized_middle_part}-receipt.pdf"
elif [[ $filename =~ ^[0-9]+\.pdf$ ]]; then
    new_filename="${converted_date} - ${sanitized_prefix}${sanitized_filename}"
elif [[ $filename =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
    new_filename="${converted_date} - ${sanitized_prefix}${filename:11}"
else
    new_filename="${converted_date} - ${sanitized_prefix}${sanitized_filename}"
fi



# Rename the file
mv "$input_file" "$new_filename"

echo "File renamed to: $new_filename"
echo "---"
