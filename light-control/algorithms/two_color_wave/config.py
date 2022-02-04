config = {
    "name": "Two Color Wave",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "colors": {
                "type": "array",
                "items": {"$ref": "#/$defs/color"},
                "minItems": 2,
                "maxItems": 2,
                "$defs": {
                    "color": {
                        "title": "Color (HSV)",
                        "type": "array",
                        "minItems": 3,
                        "maxItems": 4,
                        "items": {
                            "type": "number",
                            "inclusiveMinimum": 0.0,
                            "inclusiveMaximum": 1.0
                        }
                    }
                }
            },
            "wavelength": {
                "title": "Wavelength",
                "type": "integer",
                "default": 20
            },
            "speed": {
                "title": "Seconds per cycle (higher is slower)",
                "type": "float",
                "default": 2
            },
            "reverse": {
                "title": "Reverse",
                "type": "boolean",
                "default": False
            },
            "split": {
                "title": "Split",
                "type": "boolean",
                "default": False
            },
        },
        "default": {
            "speed": 100,
            "reverse": True
        }
    },
    "refresh_rate": 60
}