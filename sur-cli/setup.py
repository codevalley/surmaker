from setuptools import setup, find_packages

setup(
    name="sur-cli",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        'click>=8.0.0',
        'prompt_toolkit>=3.0.0',
        'rich>=10.0.0',
        'pyyaml>=6.0.0',
    ],
    entry_points={
        'console_scripts': [
            'sur=sur.cli:main',
        ],
    },
)