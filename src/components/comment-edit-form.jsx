/* global CONFIG */
import { useMemo, useCallback, useState, useRef, useEffect, forwardRef, useContext } from 'react';
import cn from 'classnames';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Portal } from 'react-portal';
import GifPicker from 'gif-picker-react';

import { faPaperclip, faSmile } from '@fortawesome/free-solid-svg-icons';
import { initialAsyncState } from '../redux/async-helpers';
import { insertText } from '../utils/insert-text';
import { Throbber } from './throbber';
import { useForwardedRef } from './hooks/forward-ref';
import { PreventPageLeaving } from './prevent-page-leaving';
import { ButtonLink } from './button-link';
import { useUploader, useFileChooser } from './hooks/uploads';
import { Icon } from './fontawesome-icons';
import { faGif } from './fontawesome-custom-icons';

import { SubmitModeHint } from './submit-mode-hint';
import { SubmittableTextarea } from './submittable-textarea';
import styles from './overlay-popup.module.scss';
import { SubmittableTextarea } from './mention-textarea';
import { OverlayPopup } from './overlay-popup';
import { tenorApiKey } from './tenor-api-key';
import { PostContext } from './post/post-context';

export const CommentEditForm = forwardRef(function CommentEditForm(
  {
    initialText = '',
    // Persistent form is always on page so we don't need to show Cancel button
    isPersistent = false,
    // Adding new comment form
    isAddingComment = false,
    onSubmit = () => {},
    onCancel = () => {},
    submitStatus = initialAsyncState,
  },
  fwdRef,
) {
  const { setInput } = useContext(PostContext);
  const input = useRef(null);
  const [text, setText] = useState(initialText);
  const [emojiActive, setemojiActive] = useState(false);
  const [gifActive, setgifActive] = useState(false);

  const onChange = useCallback((e) => setText(e), []);

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

  const insText = (insertion) => {
    const [text, selStart, selEnd] = insertText(
      insertion,
      input.current.value,
      input.current.selectionStart,
      input.current.selectionEnd,
    );
    // Pre-fill the input value to keep the cursor/selection
    // position after React update cycle
    input.current.value = text;
    input.current.setSelectionRange(selStart, selEnd);
    input.current.focus();
    setText(input.current.value);
  };

  // Expose the insertText method for the parent components
  useForwardedRef(fwdRef, { insertText: insText });

  // Uploading files
  const {
    draggingOver,
    loading: filesLoading,
    uploadProgressUI,
    uploadFile,
  } = useUploader({
    dropTargetRef: input,
    pasteTargetRef: input,
    onSuccess: useCallback((att) => insText(att.url), []),
  });
  const chooseFiles = useFileChooser({ onChoose: uploadFile, multiple: true });

  const disabled = !canSubmit || submitStatus.loading || filesLoading;

  function setEmoji(emoji) {
    setText(`${text}${emoji}`);
  }

  function setGif(gif) {
    setText(`${text} ${gif}`);
    setgifActive(false);
  }

  return (
    <div className="comment-body" role="form">
      <PreventPageLeaving prevent={canSubmit || submitStatus.loading} />
      <div>
        <SubmittableTextarea
          ref={input}
          className={cn('comment-textarea', draggingOver && 'comment-textarea__dragged')}
          value={text}
          onFocus={onFocus}
          onChange={onChange}
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
      {uploadProgressUI}
    </div>
  );
});
