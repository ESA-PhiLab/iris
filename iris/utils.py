import flask

class View:
    def __init__(self, name, description, loader):
        self.name = name
        self.description = description
        self.loader = loader

    def to_json(self):
        return {
            'name': flask.Markup(self.name),
            'description': flask.Markup(self.description),
        }
