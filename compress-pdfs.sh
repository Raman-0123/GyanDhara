#!/bin/bash

echo "🗜️  PDF Compression Script - Target: <50MB per file"
echo "=================================================="
echo ""

# Check if Ghostscript is installed
if ! command -v gs &> /dev/null; then
    echo "❌ Ghostscript not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ghostscript
    else
        echo "Please install Ghostscript: sudo apt-get install ghostscript"
        exit 1
    fi
fi

SOURCE_DIR="backend/uploads/books"
COMPRESSED_DIR="backend/uploads/books-compressed"

# Create compressed directory
mkdir -p "$COMPRESSED_DIR"

echo "📁 Source: $SOURCE_DIR"
echo "📁 Output: $COMPRESSED_DIR"
echo ""

for pdf in "$SOURCE_DIR"/*.pdf; do
    if [ -f "$pdf" ]; then
        filename=$(basename "$pdf")
        original_size=$(du -h "$pdf" | cut -f1)
        original_size_mb=$(du -m "$pdf" | cut -f1)
        
        echo "📄 Processing: $filename"
        echo "   Original size: $original_size"
        
        if [ "$original_size_mb" -le 50 ]; then
            echo "   ✅ Already under 50MB, copying as-is..."
            cp "$pdf" "$COMPRESSED_DIR/$filename"
        else
            echo "   🗜️  Compressing..."
            
            # Try high quality first
            gs -sDEVICE=pdfwrite \
               -dCompatibilityLevel=1.4 \
               -dPDFSETTINGS=/ebook \
               -dNOPAUSE -dQUIET -dBATCH \
               -sOutputFile="$COMPRESSED_DIR/$filename" \
               "$pdf"
            
            compressed_size=$(du -h "$COMPRESSED_DIR/$filename" | cut -f1)
            compressed_size_mb=$(du -m "$COMPRESSED_DIR/$filename" | cut -f1)
            
            if [ "$compressed_size_mb" -le 50 ]; then
                echo "   ✅ Compressed to: $compressed_size"
            else
                echo "   ⚠️  Still too large ($compressed_size), trying aggressive compression..."
                
                # More aggressive compression
                gs -sDEVICE=pdfwrite \
                   -dCompatibilityLevel=1.4 \
                   -dPDFSETTINGS=/screen \
                   -dNOPAUSE -dQUIET -dBATCH \
                   -sOutputFile="$COMPRESSED_DIR/$filename" \
                   "$pdf"
                
                final_size=$(du -h "$COMPRESSED_DIR/$filename" | cut -f1)
                final_size_mb=$(du -m "$COMPRESSED_DIR/$filename" | cut -f1)
                
                if [ "$final_size_mb" -le 50 ]; then
                    echo "   ✅ Compressed to: $final_size"
                else
                    echo "   ❌ Could not compress below 50MB (final: $final_size)"
                fi
            fi
        fi
        echo ""
    fi
done

echo "🎉 Compression complete!"
echo "📊 Summary:"
du -sh "$SOURCE_DIR" | awk '{print "   Original total: " $1}'
du -sh "$COMPRESSED_DIR" | awk '{print "   Compressed total: " $1}'
echo ""
echo "📝 Next steps:"
echo "   1. Review compressed PDFs in: $COMPRESSED_DIR"
echo "   2. Replace original files: mv $COMPRESSED_DIR/* $SOURCE_DIR/"
echo "   3. Run migration: node migrate-books-to-storage.js"
