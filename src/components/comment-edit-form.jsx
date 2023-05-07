/* global CONFIG */
import { useMemo, useCallback, useState, useRef, useEffect, useContext } from 'react';
import cn from 'classnames';
import GifPicker from 'gif-picker-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Portal } from 'react-portal';

import { faPaperclip, faSmile } from '@fortawesome/free-solid-svg-icons';
import { initialAsyncState } from '../redux/async-helpers';
import { tenorApiKey } from '../utils/tenor-api-key';
import { Throbber } from './throbber';
import { PreventPageLeaving } from './prevent-page-leaving';
import { ButtonLink } from './button-link';
import { Icon } from './fontawesome-icons';
import { SubmitModeHint } from './submit-mode-hint';
import { PostContext } from './post/post-context';
import { SmartTextarea } from './smart-textarea';
import { useUploader } from './uploader/uploader';
import { useFileChooser } from './uploader/file-chooser';
import { UploadProgress } from './uploader/progress';
import { OverlayPopup } from './overlay-popup';
import { faGif } from './fontawesome-custom-icons';
import styles from './overlay-popup.module.scss';

export function CommentEditForm({
  initialText = '',
  // Persistent form is always on page so we don't need to show Cancel button
  isPersistent = false,
  // Adding new comment form
  isAddingComment = false,
  onSubmit = () => {},
  onCancel = () => {},
  submitStatus = initialAsyncState,
}) {
  const { setInput } = useContext(PostContext);
  const input = useRef(null);
  const [text, setText] = useState(initialText);
  const [gifActive, setgifActive] = useState(false);
  const [emojiActive, setemojiActive] = useState(false);

  const canSubmit = useMemo(
    () => !submitStatus.loading && text.trim() !== '',
    [submitStatus.loading, text],
  );

  const doSubmit = useCallback(() => canSubmit && onSubmit(text), [canSubmit, onSubmit, text]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSubmit = useCallback(
    // Need to setText to update text that doSubmit can access
    () => (setText(text), doSubmit()),
    [doSubmit, text],
  );

  // On first focus move cursor to the end of text
  const wasFocused = useRef(false);
  const onFocus = useCallback(() => {
    if (!wasFocused.current) {
      wasFocused.current = true;
      input.current.setSelectionRange(input.current.value.length, input.current.value.length);
    }
  }, []);

  // Auto-focus dynamically added form
  useEffect(() => void (isPersistent || input.current.focus()), [isPersistent]);

  // Clean text after the persistent form submit
  useEffect(() => {
    if (submitStatus.initial && isPersistent) {
      setText('');
      input.current.blur();
    }
  }, [isPersistent, submitStatus.initial]);

  // Set input context if persistent form
  useEffect(() => {
    if (isAddingComment) {
      setInput(input.current);
    }
  }, [setInput, isAddingComment]);

  // Uploading files
  const { isUploading, uploadFile, uploadProgressProps } = useUploader({
    onSuccess: useCallback((att) => input.current?.insertText(att.url), []),
  });
  const chooseFiles = useFileChooser(uploadFile, { multiple: true });

  const disabled = !canSubmit || submitStatus.loading || isUploading;

  function setGif(gif) {
    input.current?.focus();
    setText(`${text} ${gif}`);
    setgifActive(false);
  }

  function setEmoji(emoji) {
    setText(`${text}${emoji}`);
  }

  return (
    <div className="comment-body" role="form">
      <PreventPageLeaving prevent={canSubmit || submitStatus.loading} />
      <div>
        <SmartTextarea
          ref={input}
          className="comment-textarea"
          dragOverClassName="comment-textarea__dragged"
          value={text}
          onFocus={onFocus}
          onText={setText}
          onFile={uploadFile}
          onSubmit={handleSubmit}
          minRows={2}
          maxRows={10}
          maxLength={CONFIG.maxLength.comment}
          readOnly={submitStatus.loading}
          dir={'auto'}
        />
      </div>
      <div>
        <button
          className={cn('btn btn-default btn-xs comment-post', {
            disabled,
          })}
          aria-disabled={disabled}
          aria-label={
            !canSubmit
              ? 'Submit disabled (textarea is empty)'
              : submitStatus.loading
              ? 'Submitting comment'
              : null
          }
          onClick={doSubmit}
        >
          Comment
        </button>

        {!isPersistent && (
          <ButtonLink
            className="comment-cancel"
            onClick={onCancel}
            aria-disabled={submitStatus.loading}
            aria-label={submitStatus.loading ? 'Cancel disabled (submitting)' : null}
          >
            Cancel
          </ButtonLink>
        )}

        <SubmitModeHint input={input} />

        <ButtonLink
          className="comment-file-button iconic-button"
          title="Add photo or file"
          onClick={chooseFiles}
        >
          <Icon icon={faPaperclip} />
        </ButtonLink>
        <ButtonLink
          className="comment-file-button iconic-button"
          title="Add Gif"
          /* eslint-disable-next-line react/jsx-no-bind */
          onClick={() => {
            setgifActive(!gifActive);
            input.current?.focus();
          }}
        >
          <Icon icon={faGif} />
        </ButtonLink>
        {gifActive && (
          <>
            <OverlayPopup
              /* eslint-disable-next-line react/jsx-no-bind */
              close={() => {
                setgifActive(false);
                input.current?.focus();
              }}
            >
              <GifPicker
                /* eslint-disable-next-line react/jsx-no-bind */
                onGifClick={(gif) => setGif(gif.url)}
                theme="auto"
                tenorApiKey={tenorApiKey}
              />
            </OverlayPopup>
          </>
        )}
        <ButtonLink
          className="comment-file-button iconic-button"
          title="Add Emoji"
          /* eslint-disable-next-line react/jsx-no-bind */
          onClick={() => {
            setemojiActive(!emojiActive);
          }}
        >
          <Icon icon={faSmile} />
        </ButtonLink>
        {emojiActive && (
          <>
            <Portal>
              <div className={styles.popup}>
                <div className={styles.content}>
                  <Picker
                    autoFocus={true}
                    /* eslint-disable-next-line react/jsx-no-bind */
                    onClickOutside={() => {
                      setemojiActive(false);
                      input.current?.focus();
                    }}
                    data={data}
                    /* eslint-disable-next-line react/jsx-no-bind */
                    onEmojiSelect={(emoji) => setEmoji(emoji.native)}
                  />
                </div>
              </div>
            </Portal>
          </>
        )}
        {submitStatus.loading && <Throbber className="comment-throbber" />}
        {submitStatus.error && <span className="comment-error">{submitStatus.errorText}</span>}
      </div>
      <UploadProgress {...uploadProgressProps} />
    </div>
  );
}
