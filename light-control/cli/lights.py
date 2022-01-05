from typing import Dict
import click
import zmq

def send_zmq_command(command:str, options:Dict = {}):
    context = zmq.Context()
    socket = context.socket(zmq.REQ)
    socket.connect("tcp://localhost:5555")
    socket.send_json({'command': command, **options})
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
    send_zmq_command('set_brightness', { 'brightness': brightness })

@cli.command()
def next():
    send_zmq_command('next')