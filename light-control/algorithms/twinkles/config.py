config = {
    "name": "Twinkles",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "density": {
                "title": "Density (percent)",
                "type": "number",
                "default": 0.01,
                "minimum": 0,
                "maximum": 1.0
            },
            "freq": {
                "title": "Frequency (seconds)",
                "type": "number",
                "default": 0.25,
                "minimum": 0
            },
            "fadeTime": {
                "title": "Fade Out Duration (seconds)",
                "type": "number",
                "default": 2.0,
                "minimum": 0
            }
        },
        "default": {
            "density": 0.01,
            "freq": 0.25,
            "fadeTime": 2.0
        }
    },
    "refresh_rate": 60
}