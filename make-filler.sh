#!/bin/bash

# Define the assets directory and target image names
ASSETS_DIR="assets"
TARGET_IMAGES=(
    "title_image.jpg"
    "tech_image1.jpg"
    "tech_image2.jpg"
    "premise_image.jpg"
    "characters_image.jpg"
    "season_image1.jpg"
    "ankyra_image1.jpg"
    "production_image.jpg"
)

# Ensure assets directory exists
if [ ! -d "$ASSETS_DIR" ]; then
    echo "Error: Assets directory '$ASSETS_DIR' not found."
    exit 1
fi

# Get list of all image files from subdirectories 0000 to 0060
# Assuming images are .jpg, .jpeg, or .png
mapfile -t ALL_IMAGES < <(find "$ASSETS_DIR"/{0000..0060} -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) 2>/dev/null)

# Check if any images were found
if [ ${#ALL_IMAGES[@]} -eq 0 ]; then
    echo "Error: No images found in $ASSETS_DIR/0000 to $ASSETS_DIR/0060."
    exit 1
fi

# Function to select a random image and ensure it's not already used
select_random_image() {
    local selected_images=("$@")
    local random_image
    local is_unique=false
    while [ "$is_unique" = false ]; do
        random_image=${ALL_IMAGES[$RANDOM % ${#ALL_IMAGES[@]}]}
        is_unique=true
        for used_image in "${selected_images[@]}"; do
            if [ "$random_image" = "$used_image" ]; then
                is_unique=false
                break
            fi
        done
    done
    echo "$random_image"
}

# Array to track selected images
SELECTED_IMAGES=()

# Copy and rename images
for target in "${TARGET_IMAGES[@]}"; do
    # Select a random, unique image
    image=$(select_random_image "${SELECTED_IMAGES[@]}")
    SELECTED_IMAGES+=("$image")
    
    # Copy the image to the current directory with the target name
    cp "$image" "./$target"
    if [ $? -eq 0 ]; then
        echo "Copied $image to ./$target"
    else
        echo "Error: Failed to copy $image to ./$target"
        exit 1
    fi
done

echo "Image generation complete. Ready for LaTeX compilation."
