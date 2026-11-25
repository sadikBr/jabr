def changes(values):
    """The change from each value to the next."""
    result = []
    for i in range(len(values) - 1):
        result.append(values[i + 1] - values[i])
    return result

positions = [0, 3, 8, 15, 24]    # metres, one reading per second
print(changes(positions))
