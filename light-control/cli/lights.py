import click
import json
import zmq

def get_config_json():
    with open('config.json', 'r') as json_config:
        data = json.load(json_config)

    return data

def write_config_json(data):
    with open('config.json', 'w') as f:
        f.write(json.dumps(data, indent=4))

def send_zmq_command(command:str):
    context = zmq.Context()
    socket = context.socket(zmq.REQ)
    socket.connect("tcp://localhost:5555")
    socket.send_json({'command': command})
    message = socket.recv_json()
    if ('accepted' in message and message['accepted']):
        print(f"Complete")
    else:
        print(f"There was a problem: {message.get('message', 'Unknown Error')}")

@click.group()
def cli():
    pass

@cli.command()
def on():
    send_zmq_command('on')

@cli.command()
def off():
    send_zmq_command('off')

@cli.command()
@click.argument('brightness', type=click.FloatRange(min=0.0, max=1.0), required=True)
def brightness(brightness):
    config = get_config_json()
    config['brightness'] = brightness
    write_config_json(config)

@cli.command()
def next():
    send_zmq_command('next')