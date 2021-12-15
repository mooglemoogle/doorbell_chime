config = {
    "name": "Split Rainbow",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "speed": {
                "title": "Speed (º per second)",
                "type": "integer",
                "default": 100,
                "minimum": 1,
                "maximum": 720
            },
            "reverse": {
                "title": "Reverse",
                "type": "boolean",
                "default": False
            }
        },
        "default": {
            "speed": 100,
            "reverse": False
        }
    },
    "refresh_rate": 60
}