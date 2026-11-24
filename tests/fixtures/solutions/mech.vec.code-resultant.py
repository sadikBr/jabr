import math

def resultant(vectors):
    """The sum of the vectors, as (magnitude, angle in degrees)."""
    total_x = 0
    total_y = 0
    for magnitude, angle in vectors:
        total_x += magnitude * math.cos(math.radians(angle))
        total_y += magnitude * math.sin(math.radians(angle))
    size = math.hypot(total_x, total_y)
    direction = math.degrees(math.atan2(total_y, total_x))
    return size, direction

# Rowing at 3 m/s aimed at 131.8 degrees, in a 2 m/s current.
size, direction = resultant([(3, 131.8), (2, 0)])
print(f"You travel at {size:.2f} m/s, in the direction {direction:.1f} degrees")
