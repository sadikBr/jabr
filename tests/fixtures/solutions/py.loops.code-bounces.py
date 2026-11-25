def count_bounces(height, ratio, limit):
    """How many bounces until the ball rises less than `limit` metres."""
    bounces = 0
    while height >= limit:
        height = height * ratio
        bounces = bounces + 1
    return bounces

print(count_bounces(10, 0.6, 1))
print(count_bounces(2, 0.9, 0.1))
