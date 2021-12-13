from setuptools import setup

setup(
    name='lights',
    version='0.1.0',
    py_modules=['lights'],
    install_requires=[
        'Click',
    ],
    entry_points={
        'console_scripts': [
            'lights = lights:cli',
        ],
    },
)