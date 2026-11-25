def slope(x1, y1, x2, y2):
    """The slope of the straight line through (x1, y1) and (x2, y2)."""
    return (y2 - y1) / (x2 - x1)

print("Taxi fare, from 1 km to 3 km:", slope(1, 5, 3, 9), "euros per km")
print("A hill that drops 30 m over 200 m:", slope(0, 30, 200, 0))
