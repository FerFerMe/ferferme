import cn from 'classnames';
import { CODE_ENTER, CODE_TAB, CODE_ESCAPE, CODE_UP, CODE_DOWN } from 'keycode-js';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';

import TextareaAutosize from 'react-textarea-autosize';
import getCaretCoordinates from 'textarea-caret';
import getInputSelection, { setCaretPosition } from 'get-input-selection';

import { captureException } from '@sentry/react';
import { submittingByEnter } from '../services/appearance';
import { makeJpegIfNeeded } from '../utils/jpeg-if-needed';
import { insertText } from '../utils/insert-text';
import { subscriptions, subscribers } from '../redux/action-creators';
import styles from './smart-textarea.module.scss';
import { useForwardedRef } from './hooks/forward-ref';
import { useEventListener } from './hooks/sub-unsub';

const OPTION_LIST_Y_OFFSET = 20;
const OPTION_LIST_MIN_WIDTH = 150;

const propTypes = {
  defaultValue: PropTypes.string,
  disabled: PropTypes.bool,
  maxOptions: PropTypes.number,
  onBlur: PropTypes.func,
  onKeyDown: PropTypes.func,
  onRequestOptions: PropTypes.func,
  onSelect: PropTypes.func,
  changeOnSelect: PropTypes.func,
  regex: PropTypes.string,
  matchAny: PropTypes.bool,
  minChars: PropTypes.number,
  requestOnlyIfNoOptions: PropTypes.bool,
  spaceRemovers: PropTypes.arrayOf(PropTypes.string),
  spacer: PropTypes.string,
  trigger: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  options: PropTypes.oneOfType([PropTypes.object, PropTypes.arrayOf(PropTypes.string)]),
  enableSpaceRemovers: PropTypes.bool,
};

const defaultProps = {
  value: null,
  disabled: false,
  defaultValue: '',
  onKeyDown: () => {},
  onRequestOptions: () => {},
  onSelect: () => {},
  changeOnSelect: (trigger, slug) => trigger + slug,
  regex: '^[A-Za-z0-9\\-_]+$',
  matchAny: false,
  minChars: 0,
  requestOnlyIfNoOptions: true,
  spaceRemovers: [',', '.', '!', '?'],
  spacer: ' ',
  trigger: '@',
  enableSpaceRemovers: false,
};

/**
 * SmartTextarea
 *
 * Allows to:
 * - submit text by Enter of Ctrl/Cmd+Enter
 * - handle files paste and drag-n-drop
 * - insert text to the cursor position using .insertText() instance method
 * - use onText attribute to handle updated text (it is necessary for insertText
 *   updates, which doesn't trigger onChange)
 */

const getUniqueUsernames = (subscribers, subscriptions) => {
  const subscribersUsername = (subscribers?.payload || []).map((e) => e.username);
  const subscriptionsUsername = (subscriptions?.payload || []).map((e) => e.username);

  return Array.from(new Set(subscribersUsername.concat(subscriptionsUsername))).sort();
};

export const SmartTextarea = forwardRef(function SmartTextarea(
  {
    // trigger on submit by Enter of Ctrl/Cmd+Enter (no args)
    onSubmit,
    // trigger on new file dropped or pasted (one arg, the passed File), can be
    // triggered multiple times synchronously
    onFile,
    // trigger on text change (one arg, new text)
    onText,
    // Regular onChange handler
    onChange,
    component: Component = TextareaAutosize,
    className,
    dragOverClassName,
    ...props
  },
  fwdRef,
) {
  const ref = useForwardedRef(fwdRef, {});
  useSubmit(onSubmit, ref);
  const draggingOver = useFile(onFile, ref);

  const [helperVisible, setHelperVisible] = useState(false);
  const [left, setLeft] = useState(0);
  const [corner, setCorner] = useState(0);
  const [selection, setSelection] = useState(0);
  const [top, setTop] = useState(0);
  const [matchStart, setMatchStart] = useState(0);
  const [matchLength, setMatchLength] = useState(0);

  const [options, setOptions] = useState([]);
  const recentValue = useRef('ref');

  const dispatch = useDispatch();
  const authenticated = useSelector((state) => state.authenticated);
  const thisUsername = useSelector((state) => state.user.username || null);
  const allSubscribers = useSelector((state) => state.usernameSubscribers);
  const allSubscriptions = useSelector((state) => state.usernameSubscriptions);

  useEffect(() => {
    if (authenticated) {
      dispatch(subscriptions(thisUsername));
      dispatch(subscribers(thisUsername));
    }
  }, [authenticated, dispatch, thisUsername]);

  const userNames = getUniqueUsernames(allSubscribers, allSubscriptions);

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getMatch = useCallback(
    (str, caret, providedOptions) => {
      const { trigger, matchAny, regex } = defaultProps;
      const re = new RegExp(regex);
      const triggerLength = trigger.length;
      let slugData = null;

      for (let i = caret - 1; i >= 0; --i) {
        const substr = str.slice(i, caret);
        const match = substr.match(re);

        if (!match && !isTrigger(trigger, str, i)) {
          break;
        }

        if (isTrigger(trigger, str, i)) {
          const triggerOptions = providedOptions;
          if (!triggerOptions) {
            continue;
          }

          const matchedSlug = str.slice(i + triggerLength, caret);
          const options = triggerOptions.filter(
            (slug) =>
              slug.toLowerCase().includes(matchedSlug.toLowerCase()) &&
              (matchAny || slug.toLowerCase().startsWith(matchedSlug.toLowerCase())),
          );

          const matchLength = matchedSlug.length;
          slugData = {
            trigger,
            matchStart: i + triggerLength,
            matchLength,
            options,
          };
          break;
        }
      }

      return slugData;
    },
    [isTrigger],
  );

  const isTrigger = useCallback(
    (trigger, str, i) => !trigger || str.slice(i, i + trigger.length) === trigger,
    [],
  );

  const handleChange = useCallback(
    (e) => {
      const { spaceRemovers, spacer, enableSpaceRemovers } = props;
      const old = recentValue.current;
      const str = e.target.value;
      const caret = getInputSelection(e.target).end;

      if (str.length === 0) {
        setHelperVisible(false);
        return onChange?.(e), onText?.(e.target.value), false;
      }

      recentValue.current = str;

      if (str.length === 0 || !caret) {
        onChange?.(e);
        onText?.(e.target.value);
        return false;
      }

      if (enableSpaceRemovers && spaceRemovers.length > 0 && str.length > 2 && spacer.length > 0) {
        for (const [i, char] of str.entries()) {
          if (old[i] !== char) {
            if (
              i >= 2 &&
              char === spacer &&
              !spaceRemovers.includes(str[i - 2]) &&
              spaceRemovers.includes(str[i]) &&
              getMatch(str.slice(0, Math.max(0, i - 2)), caret - 3, userNames)
            ) {
              const newValue = `${str.slice(0, i - 1)}${char}${str.slice(i - 1, i)}${str.slice(
                i + 1,
              )}`;

              updateCaretPosition(i + 1);
              ref.current.value = newValue;

              onChange?.(newValue);
              onText?.(newValue);
              return false;
            }

            break;
          }
        }

        props.enableSpaceRemovers = false;
      }

      updateHelper(str, caret, userNames);
      onChange?.(e);
      onText?.(e.target.value);
      return false;
    },
    [
      props,
      recentValue,
      setHelperVisible,
      updateCaretPosition,
      ref,
      updateHelper,
      onText,
      getMatch,
      onChange,
      userNames,
    ],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (helperVisible) {
        const element = document.querySelector('#mentionItemsbody');
        if (event.code === CODE_ESCAPE) {
          event.preventDefault();
          resetHelper();
        } else if (event.code === CODE_TAB) {
          event.preventDefault();
          handleSelection(selection);
        } else if (event.code === CODE_UP && selection >= 1) {
          event.preventDefault();
          setSelection(selection - 1);
          element.scrollTop = (selection - 2) * 44;
        } else if (event.code === CODE_DOWN && selection < options.length - 1) {
          event.preventDefault();
          setSelection(selection + 1);
          element.scrollTop = selection * 44;
        }
      }
    },
    [helperVisible, options, selection, handleSelection, resetHelper],
  );

  const handleResize = () => {
    setHelperVisible(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSelection = useCallback(
    (idx) => {
      const { spacer, onSelect, changeOnSelect, trigger } = props;

      const slug = options[idx];
      const value = recentValue.current;
      const event = { target: ref.current };
      const changedStr = changeOnSelect(trigger, slug);

      event.target.value = `${value.slice(
        0,
        Math.max(0, matchStart - trigger.length),
      )}${changedStr}${spacer}${value.slice(Math.max(0, matchStart + matchLength))}`;
      handleChange(event);
      onSelect?.(event.target.value);

      resetHelper();

      updateCaretPosition(
        value.slice(0, Math.max(0, matchStart - trigger.length)).length + changedStr.length + 1,
      );
    },
    [
      handleChange,
      resetHelper,
      updateCaretPosition,
      options,
      recentValue,
      matchStart,
      matchLength,
      ref,
      props,
    ],
  );

  const updateCaretPosition = useCallback(
    (caret) => {
      setCaretPosition(ref.current, caret);
    },
    [ref],
  );

  const updateHelper = useCallback(
    (str, caret, options) => {
      const { minChars, onRequestOptions, requestOnlyIfNoOptions } = props;
      const input = ref.current;

      const slug = getMatch(str, caret, options);

      if (!slug || slug.options.length === 0) {
        resetHelper();
        return;
      }

      const caretPos = getCaretCoordinates(input, caret);
      const rect = input.getBoundingClientRect();

      const top = caretPos.top + input.offsetTop;
      const left = Math.min(
        caretPos.left + input.offsetLeft - OPTION_LIST_Y_OFFSET,
        input.offsetLeft + rect.width - OPTION_LIST_MIN_WIDTH,
      );
      const corner = Math.min(caretPos.left + input.offsetLeft, input.offsetLeft + rect.width);

      if (
        slug.matchLength < minChars ||
        (slug.options.length === 1 && slug.options[0].length === slug.matchLength)
      ) {
        if (!requestOnlyIfNoOptions) {
          onRequestOptions?.(str.slice(slug.matchStart, slug.matchStart + slug.matchLength));
        }
        resetHelper();
        return;
      }

      setHelperVisible(true);
      setTop(top);
      setLeft(left);
      setCorner(corner);
      setMatchStart(slug.matchStart);
      setMatchLength(slug.matchLength);
      setOptions(slug.options);
    },
    [
      props,
      ref,
      resetHelper,
      getMatch,
      setHelperVisible,
      setTop,
      setLeft,
      setCorner,
      setMatchStart,
      setMatchLength,
      setOptions,
    ],
  );

  const resetHelper = useCallback(() => {
    setHelperVisible(false);
    setSelection(0);
  }, [setHelperVisible, setSelection]);

  const onBlur = () => {
    resetHelper();
  };

  const HelperOptions = ({
    options,
    selection,
    value,
    matchStart,
    matchLength,
    handleSelection,
  }) => {
    return options.slice(0, options.length).map((val, idx) => {
      const highlightStart = val
        .toLowerCase()
        .indexOf(value.slice(matchStart, matchStart + matchLength).toLowerCase());
      return (
        <div
          className={idx === selection ? styles.activeMention : styles.mentionItemsbodycontent}
          key={val}
          /* eslint-disable-next-line react/jsx-no-bind */
          onMouseDown={(event) => {
            event.preventDefault?.();
            handleSelection(idx);
          }}
          /* eslint-disable-next-line react/jsx-no-bind */
          onPointerEnter={(event) => {
            event.preventDefault?.();
            setSelection(idx);
          }}
        >
          <span>
            {' '}
            {val.slice(0, highlightStart)}
            <strong>{val.slice(highlightStart, highlightStart + matchLength)}</strong>
            {val.slice(highlightStart + matchLength)}
          </span>
        </div>
      );
    });
  };

  const renderAutocompleteList = () => {
    if (!helperVisible || options.length === 0) {
      return null;
    }

    if (selection >= options.length) {
      setSelection(0);
      return null;
    }

    return (
      <>
        <div className={styles.mentionCorner} style={{ left: corner, top }} />
        <div className={styles.mentionContainer} style={{ left, top }}>
          <div className={styles.mentionItems}>
            <div id="mentionItemsbody" className={styles.mentionItemsbody}>
              <HelperOptions
                options={options}
                selection={selection}
                value={value}
                matchStart={matchStart}
                matchLength={matchLength}
                handleSelection={handleSelection}
              />
            </div>
          </div>
        </div>
      </>
    );
  };

  const { defaultValue, value, disabled, ...rest } = props;
  const propagated = Object.assign({}, rest);
  Object.keys(propTypes).forEach((k) => {
    delete propagated[k];
  });

  let val = '';

  if (typeof value !== 'undefined' && value !== null) {
    val = value;
  } else if (value) {
    val = value;
  } else if (defaultValue) {
    val = defaultValue;
  }

  ref.current.insertText = useCallback(
    (insertion) => {
      const input = ref.current;
      const [text, selStart, selEnd] = insertText(
        insertion,
        input.value,
        input.selectionStart,
        input.selectionEnd,
      );
      // Pre-fill the input value to keep the cursor/selection
      // position after React update cycle
      input.value = text;
      input.setSelectionRange(selStart, selEnd);
      input.focus();
      onText?.(input.value);
    },
    [onText, ref],
  );

  return (
    <>
      <div>
        <Component
          className={cn(className, draggingOver && dragOverClassName)}
          disabled={disabled}
          /* eslint-disable-next-line react/jsx-no-bind */
          onBlur={onBlur}
          /* eslint-disable-next-line react/jsx-no-bind */
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={ref}
          value={val}
          {...propagated}
        />
        {renderAutocompleteList()}
      </div>
    </>
  );
});

SmartTextarea.propTypes = propTypes;
SmartTextarea.defaultProps = defaultProps;

function useSubmit(onSubmit, ref) {
  const submitMode = useSelector((state) => state.submitMode);

  const onKeyDown = useCallback(
    (event) => {
      if (!onSubmit || event.key !== CODE_ENTER) {
        return;
      }

      if (submittingByEnter(submitMode)) {
        /**
         * The Enter press acts as submit unless the Shift or Alt key is
         * pressed.
         */

        if (event.shiftKey) {
          return;
        }

        if (event.altKey) {
          // Insert new line
          const { target } = event;
          const { value, selectionStart, selectionEnd } = target;
          target.value = `${value.slice(0, selectionStart)}\n${value.slice(selectionEnd)}`;
          target.selectionStart = selectionStart + 1;
          target.selectionEnd = selectionStart + 1;
          event.preventDefault();
          return;
        }
      } else if (!(event.ctrlKey || event.metaKey)) {
        /**
         * The Ctrl/Cmd+Enter press acts as submit
         */
        return;
      }

      event.preventDefault();
      onSubmit();
    },
    [onSubmit, submitMode],
  );

  useEventListener(ref, 'keydown', onKeyDown);
}

function useFile(onFile, ref) {
  const enabled = !!onFile;
  const [draggingOver, setDraggingOver] = useState(false);
  const onDragEnter = useCallback(
    (e) => enabled && containsFiles(e) && setDraggingOver(true),
    [enabled],
  );
  const onDragLeave = useCallback(() => enabled && setDraggingOver(false), [enabled]);
  const onDragOver = useCallback(
    (e) => enabled && containsFiles(e) && e.preventDefault(),
    [enabled],
  );
  const onDrop = useCallback(
    (e) => {
      if (!enabled) {
        return;
      }
      setDraggingOver(false);
      if (containsFiles(e)) {
        e.preventDefault();
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          onFile(e.dataTransfer.files[i]);
        }
      }
    },
    [enabled, onFile],
  );

  const onPaste = useCallback(
    (e) => {
      if (!enabled || !e.clipboardData?.items) {
        return;
      }

      const items = [...e.clipboardData.items];

      // If there is some plain text in clipboard, use it and don't try to find image
      if (items.some((it) => it.type.startsWith('text/plain'))) {
        return;
      }

      const imagePromises = [];
      for (const it of items) {
        if (!it.type.startsWith('image/')) {
          continue;
        }
        const blob = it.getAsFile();
        // Is it a screenshot paste?
        if (!blob.name || (blob.name === 'image.png' && Date.now() - blob.lastModified < 1000)) {
          if (!blob.name) {
            blob.name = 'image.png';
          }
          imagePromises.push(
            makeJpegIfNeeded(blob).catch((error) => {
              captureException(error, {
                level: 'error',
                tags: { area: 'upload' },
              });
              return null;
            }),
          );
        } else {
          // Probably a regular file copy/paste
          imagePromises.push(Promise.resolve(blob));
        }
      }
      if (imagePromises.length > 0) {
        e.preventDefault();
      }

      // Call 'onFile' in order of imagePromises
      imagePromises.reduce(async (prev, it) => {
        await prev;
        const f = await it;
        f && onFile(f);
      }, Promise.resolve(null));
    },
    [enabled, onFile],
  );

  useEventListener(ref, 'dragenter', onDragEnter);
  useEventListener(ref, 'dragleave', onDragLeave);
  useEventListener(ref, 'dragover', onDragOver);
  useEventListener(ref, 'drop', onDrop);
  useEventListener(ref, 'paste', onPaste);

  return draggingOver;
}

function containsFiles(dndEvent) {
  if (dndEvent.dataTransfer && dndEvent.dataTransfer.types) {
    // Event.dataTransfer.types is DOMStringList (not Array) in Firefox,
    // so we can't just use indexOf().
    for (let i = 0; i < dndEvent.dataTransfer.types.length; i++) {
      if (dndEvent.dataTransfer.types[i] === 'Files') {
        return true;
      }
    }
  }
  return false;
}
