from PIL import Image

def image_to_text(image_path):
    # Open the image
    img = Image.open(image_path)
    
    # Get image dimensions
    width, height = img.size
    
    # Ensure the image has the expected dimensions
    if width != 28 or height != 44:
        raise ValueError(f"The image must be 28x44 pixels. This image is {width}x{height}")
    
    # Color mapping (reverse of the original)
    color_to_char = {
        (0, 0, 0): '1',      # Black
        (255, 255, 255): '0', # White
        (0, 0, 255): ' '      # Blue
    }
    
    # Convert image to RGB mode if it's not already
    img = img.convert('RGB')
    
    # Get pixel data
    pixels = img.load()
    
    # Initialize an empty string to store the result
    result = ""
    
    # Iterate through each pixel
    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]
            # Find the closest color in our map
            char = min(color_to_char, key=lambda c: sum((c[i] - pixel[i])**2 for i in range(3)))
            result += color_to_char[char]
    
    return result

# Example usage
image_path = 'output_image.png'  # Replace with your image path
try:
    text = image_to_text(image_path)
    print(f"Extracted text (length: {len(text)}):")
    print(text)
except Exception as e:
    print(f"An error occurred: {e}")