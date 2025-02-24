import { memo, useCallback, useEffect, useState } from 'react';
import { Portal } from 'react-portal';
import { intentToScroll } from '../../services/unscroll';

import { ButtonLink } from '../button-link';
import { useBool } from '../hooks/bool';
import { CLOSE_ON_CLICK_OUTSIDE } from '../hooks/drop-down';
import { useDropDownKbd } from '../hooks/drop-down-kbd';
import { useMediaQuery } from '../hooks/media-query';
import { MoreWithTriangle } from '../more-with-triangle';

import { translate } from '../../utils/translator';
import { PostCommentLikes } from './post-comment-likes';
import { PostCommentMoreMenu } from './post-comment-more-menu';

export const PostCommentMore = memo(function PostCommentMore({
  className,
  id,
  setMenuOpener,
  onMenuOpened,
  ...menuProps
}) {
  const fixedMenu = useMediaQuery('(max-width: 450px)');

  const { opened, toggle, pivotRef, menuRef, close, setOpened } = useDropDownKbd({
    closeOn: CLOSE_ON_CLICK_OUTSIDE,
    fixed: fixedMenu,
  });
  //console.log(menuProps);
  const [likesOpened, , openLikes, closeLikes] = useBool(false);
  const [translateText, setTranslateText] = useState(null);
  const [isTranslatable, setIsTranslatable] = useState(true);

  const doAndClose = (h) => h && ((...args) => (h(...args), close()));

  const doTranslate = useCallback(async () => {
    setTranslateText(menuProps.translateRef.current.innerHTML);
    menuProps.translateRef.current.innerText = await translate(
      menuProps.translateRef.current.innerText,
    );
    setIsTranslatable(false);
  }, [menuProps.translateRef, setTranslateText, setIsTranslatable]);

  const undoTranslate = useCallback(() => {
    menuProps.translateRef.current.innerHTML = translateText;
    setIsTranslatable(true);
  }, [setIsTranslatable, translateText, menuProps.translateRef]);

  const menuPropsWithClose = { doAndClose, doShowLikes: doAndClose(openLikes) };
  Object.keys(menuProps).forEach((key) => {
    if (/^do[A-Z]/.test(key)) {
      menuPropsWithClose[key] = doAndClose(menuProps[key]);
    } else {
      menuPropsWithClose[key] = menuProps[key];
    }
  });

  useEffect(() => {
    setMenuOpener(() => setOpened(true));
    return () => setMenuOpener(null);
  }, [setMenuOpener, setOpened]);

  useEffect(() => void onMenuOpened(opened), [onMenuOpened, opened]);

  useEffect(() => {
    if (fixedMenu && opened) {
      // Fix scroll position
      const menuTop = document.documentElement.clientHeight - menuRef.current.scrollHeight;
      const linkBottom = pivotRef.current.getBoundingClientRect().bottom;
      if (linkBottom > menuTop) {
        intentToScroll();
        window.scrollBy({
          top: linkBottom - menuTop + 4,
          behavior: 'smooth',
        });
      }
    }
  }, [fixedMenu, opened, menuRef, pivotRef]);

  const doCloseLikes = useCallback(() => (closeLikes(), setOpened(true)), [closeLikes, setOpened]);

  return (
    <>
      <ButtonLink
        className={className}
        ref={pivotRef}
        onClick={toggle}
        aria-haspopup
        aria-expanded={opened}
      >
        <MoreWithTriangle>more</MoreWithTriangle>
      </ButtonLink>
      {opened && (
        <Portal>
          <PostCommentMoreMenu
            doTranslate={doTranslate}
            undoTranslate={undoTranslate}
            isTranslatable={isTranslatable}
            {...menuPropsWithClose}
            id={id}
            ref={menuRef}
            fixed={fixedMenu}
          />
        </Portal>
      )}
      {likesOpened && <PostCommentLikes id={id} close={doCloseLikes} />}
    </>
  );
});
