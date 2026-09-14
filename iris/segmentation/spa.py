"""
React SPA routes for segmentation interface.

Handles the main segmentation route that serves the React Single Page Application.
"""
import flask

from iris.project import project

spa_bp = flask.Blueprint(
    'segmentation_spa', __name__,
    url_prefix='/segmentation'
)


@spa_bp.route('/', methods=['GET'])
def segmentation_spa():
    """Serve React SPA for segmentation route."""
    try:
        # Same logic as the original index() function
        image_id = flask.request.args.get('image_id', None)

        if image_id is None:
            image_id = project.get_start_image_id()

            user_id = flask.session.get('user_id', None)
            if user_id:
                # Get the mask that the user worked on the last time
                from iris.models import Action
                last_mask = Action.query \
                    .filter_by(user_id=user_id) \
                    .order_by(Action.last_modification.desc()) \
                    .first()

                if last_mask is not None:
                    image_id = last_mask.image_id
        elif image_id not in project.image_ids:
            return flask.make_response('Unknown image id!', 404)

        metadata = project.get_metadata(image_id)

        # Render the React SPA
        return flask.render_template(
            'segmentation/react-app.html',
            image_id=image_id,
            image_location=metadata.get("location", [0, 0]),
            debug_mode=project.debug
        )

    except Exception:
        flask.current_app.logger.exception("Error in segmentation SPA route")
        return flask.make_response("Internal server error", 500)
