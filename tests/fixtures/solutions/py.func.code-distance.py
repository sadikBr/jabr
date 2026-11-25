import math

def hypotenuse(a, b):
    """The long side of a right-angled triangle with short sides a and b."""
    return math.sqrt(a**2 + b**2)

def distance(x1, y1, x2, y2):
    """The straight-line distance between the points (x1, y1) and (x2, y2)."""
    return hypotenuse(x2 - x1, y2 - y1)

print(hypotenuse(3, 4))
print(distance(1, 1, 4, 5))
