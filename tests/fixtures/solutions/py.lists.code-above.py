def above(values, threshold):
    """The values that are greater than the threshold."""
    result = []
    for value in values:
        if value > threshold:
            result.append(value)
    return result

speeds = [5.29, 10.10, 11.11, 11.63, 12.05, 12.20, 12.35, 12.20, 12.05, 12.05]
print(above(speeds, 12))
