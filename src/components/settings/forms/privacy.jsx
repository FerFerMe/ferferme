/* global CONFIG */
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useField, useForm } from 'react-final-form-hooks';
import { faLock, faUserFriends, faGlobeAmericas } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router';

import { updateUser } from '../../../redux/action-creators';
import { Throbber } from '../../throbber';
import { PreventPageLeaving } from '../../prevent-page-leaving';
import { RadioInput, CheckboxInput } from '../../form-utils';
import { Icon } from '../../fontawesome-icons';

import settingsStyles from '../settings.module.scss';

const PUBLIC = 'public',
  PROTECTED = 'protected',
  PRIVATE = 'private',
  ALL = 'all',
  FRIENDS = 'friends';

export default (function PrivacyForm() {
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user);
  const formStatus = useSelector((state) => state.settingsForms.privacyStatus);

  const form = useForm(
    useMemo(
      () => ({
        initialValues: initialValues(userData),
        onSubmit: onSubmit(userData.id, dispatch),
      }),
      [dispatch, userData],
    ),
  );

  const privacy = useField('privacy', form.form);
  const acceptDirectsFrom = useField('acceptDirectsFrom', form.form);
  const sanitizeMediaMetadata = useField('sanitizeMediaMetadata', form.form);

  return (
    <form onSubmit={form.handleSubmit}>
      <PreventPageLeaving prevent={form.dirty} />

      <section className={settingsStyles.formSection}>
        <h4 id="feed-visibility">Your account is:</h4>

        <div className="form-group">
          <div className="radio">
            <label>
              <RadioInput field={privacy} value={PUBLIC} />
              <Icon className={settingsStyles.privacyIcon} icon={faGlobeAmericas} /> Public &mdash;
              anyone can read your posts
              {CONFIG.newUsersProtected ? '' : <em> (default)</em>}
            </label>
          </div>
          <div className="radio">
            <label>
              <RadioInput field={privacy} value={PROTECTED} />
              <Icon className={settingsStyles.privacyIcon} icon={faUserFriends} /> Protected &mdash;
              only registered users can read your posts
              {CONFIG.newUsersProtected ? <em> (default)</em> : ''}
            </label>
          </div>
          <div className="radio">
            <label>
              <RadioInput field={privacy} value={PRIVATE} />
              <Icon className={settingsStyles.privacyIcon} icon={faLock} /> Private &mdash; only
              registered users you approve to be your subscribers can read your posts
            </label>
          </div>
        </div>
        <p>
          Note: your posts are always protected from search engines. Your posts to public groups are
          considered public.
        </p>
      </section>

      <section className={settingsStyles.formSection}>
        <h4 id="accept-directs">Accept direct messages from:</h4>

        <div className="form-group">
          <div className="radio">
            <label>
              <RadioInput field={acceptDirectsFrom} value={ALL} />
              All users
            </label>
          </div>
          <div className="radio">
            <label>
              <RadioInput field={acceptDirectsFrom} value={FRIENDS} />
              Only users you subscribe to
            </label>
          </div>
        </div>
      </section>

      <section className={settingsStyles.formSection}>
        <h4 id="files">Your files</h4>

        <div className="form-group">
          <div className="checkbox">
            <label>
              <CheckboxInput field={sanitizeMediaMetadata} />
              Remove geolocation and other sensitive metadata from photos and videos you upload
            </label>
          </div>
        </div>
        <p className="text-muted">
          Sanitize previously uploaded files <Link to="/settings/sanitize-media">here</Link>.
        </p>
      </section>

      <div className="form-group">
        <button
          className="btn btn-primary"
          type="submit"
          disabled={formStatus.loading || !form.dirty || form.hasValidationErrors}
        >
          {formStatus.loading ? 'Updating privacy settings…' : 'Update privacy settings'}
        </button>{' '}
        {formStatus.loading && <Throbber />}
      </div>
      {formStatus.error && (
        <p className="alert alert-danger" role="alert">
          {formStatus.errorText}
        </p>
      )}
      {formStatus.success && (
        <p className="alert alert-success" role="alert">
          Privacy settings updated
        </p>
      )}
    </form>
  );
});

function initialValues(userData) {
  return {
    privacy: privacyFlagsToString(userData),
    acceptDirectsFrom: userData.preferences.acceptDirectsFrom,
    sanitizeMediaMetadata: userData.preferences.sanitizeMediaMetadata,
  };
}

function onSubmit(id, dispatch) {
  return (values) => {
    const { isPrivate, isProtected } = privacyStringToFlags(values.privacy);
    dispatch(
      updateUser({
        id,
        isPrivate,
        isProtected,
        backendPrefs: {
          acceptDirectsFrom: values.acceptDirectsFrom,
          sanitizeMediaMetadata: values.sanitizeMediaMetadata,
        },
      }),
    );
  };
}

export function privacyFlagsToString({ isPrivate, isProtected }) {
  if (isPrivate === '1') {
    return PRIVATE;
  }
  if (isProtected === '1') {
    return PROTECTED;
  }
  return PUBLIC;
}

export function privacyStringToFlags(privacy) {
  return {
    isPrivate: privacy === PRIVATE ? '1' : '0',
    isProtected: privacy === PROTECTED ? '1' : '0',
  };
}
