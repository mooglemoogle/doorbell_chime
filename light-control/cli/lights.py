import click
import json

def get_config_json():
    with open('config.json', 'r') as json_config:
        data = json.load(json_config)

    return data

def write_config_json(data):
    with open('config.json', 'w') as f:
        f.write(json.dumps(data, indent=4))

@click.group()
def cli():
    pass

@cli.command()
def on():
    config = get_config_json()
    config['running'] = True
    write_config_json(config)

@cli.command()
def off():
    config = get_config_json()
    config['running'] = False
    write_config_json(config)

@cli.command()
@click.argument('brightness', type=click.FloatRange(min=0.0, max=1.0), required=True)
def brightness(brightness):
    config = get_config_json()
    config['brightness'] = brightness
    write_config_json(config)