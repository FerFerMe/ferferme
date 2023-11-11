/* global CONFIG */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { connect, useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';

import { faChevronDown, faChevronUp, faTimes } from '@fortawesome/free-solid-svg-icons';
import { htmlSafe } from '../utils';
import { listHomeFeeds, openSidebar, setUserColorScheme } from '../redux/action-creators';
import {
  SCHEME_DARK,
  SCHEME_SYSTEM,
  SCHEME_LIGHT,
  systemColorSchemeSupported,
} from '../services/appearance';
import { bookmarkletHref } from '../bookmarklet/loader';
import UserName from './user-name';
import RecentGroups from './recent-groups';
import ErrorBoundary from './error-boundary';
import { UserPicture } from './user-picture';
import { SidebarHomeFeeds } from './sidebar-homefeeds';
import { ButtonLink } from './button-link';
import { Throbber } from './throbber';
import { useMediaQuery } from './hooks/media-query';
import { useResizing } from './hooks/resizing';
import { Icon } from './fontawesome-icons';
import { SideBarMemories } from './sidebar-memories';
import { faPenToSquare } from './fontawesome-custom-icons';
import CreatePost from './create-post';

function LoggedInBlock({ user, signOut }) {
  const signOutStatus = useSelector((state) => state.signOutStatus);
  return (
    <div className="logged-in" role="region">
      <div className="avatar">
        <UserPicture user={user} />
      </div>

      <div className="user">
        <div className="author">
          <UserName user={user} noUserCard>
            {user.screenName}
          </UserName>
        </div>
        <div>
          <Link to="/settings">settings</Link>
          &nbsp;-&nbsp;
          <ButtonLink onClick={signOut} disabled={signOutStatus.loading}>
            sign out
          </ButtonLink>{' '}
          {signOutStatus.loading && <Throbber />}
        </div>
      </div>
    </div>
  );
}

const SideBarFriends = ({ user }) => {
  const dispatch = useDispatch();
  const homeFeedsCount = useSelector((state) => state.homeFeeds.length);
  const homeFeedsStatus = useSelector((state) => state.homeFeedsStatus);
  useEffect(
    () => void (homeFeedsStatus.initial && dispatch(listHomeFeeds())),
    [homeFeedsStatus.initial, dispatch],
  );

  const hasNotifications =
    user.unreadNotificationsNumber > 0 && !user.frontendPreferences.hideUnreadNotifications;
  const hasUnreadDirects = user.unreadDirectsNumber > 0;

  const directsStyle = hasUnreadDirects ? { fontWeight: 'bold' } : {};
  const notificationsStyle = hasNotifications ? { fontWeight: 'bold' } : {};
  const directsCountBadge = hasUnreadDirects ? `(${user.unreadDirectsNumber})` : '';
  const notificationsCountBadge = hasNotifications ? `(${user.unreadNotificationsNumber})` : '';

  return (
    <>
      <div className="box" role="navigation">
        <div className="box-header-friends" role="heading">
          <Link to={`/${user.username}`}>My</Link>
        </div>
        <div className="box-body">
          <ul>
            <li className="p-home">
              <Link to="/">Home</Link>
            </li>

            <li className="p-direct-messages">
              <Link to="/filter/direct" style={directsStyle}>
                Direct messages {directsCountBadge}
              </Link>
            </li>
            <li className="p-my-discussions">
              <Link to="/filter/discussions">Discussions</Link>
            </li>
            <li className="p-saved-posts">
              <Link to="/filter/saves">Saved posts</Link>
            </li>
            <li className="p-best-of">
              <Link to="/summary/1">Best of the day</Link>
            </li>
            <li className="p-home">
              <Link to="/filter/notifications" style={notificationsStyle}>
                Notifications {notificationsCountBadge}
              </Link>
            </li>
            <li className="p-calendar">
              <Link to={`/${user.username}/calendar`} className="with-label--new">
                Calendar
              </Link>
            </li>
          </ul>
        </div>

        {homeFeedsCount === 1 && (
          <div className="box-footer">
            <Link to={`/friends`}>Browse/edit friends and lists</Link>
          </div>
        )}
      </div>

      {homeFeedsCount > 1 && (
        <div className="box" role="navigation">
          <div className="box-header-friends" role="heading">
            <Link to="/friends">Friend lists</Link>
          </div>

          <div className="box-body">
            <SidebarHomeFeeds homeFeedsCount={homeFeedsCount} />
          </div>

          <div className="box-footer">
            <Link to={`/friends`}>Browse/edit friends and lists</Link>
          </div>
        </div>
      )}
    </>
  );
};

const SideBarFreeFeed = () => (
  <ul>
    <li>
      <Link to="/search">Search</Link>
    </li>
    <li className="p-invites">
      <Link to="/invite">Invite</Link>
    </li>
    <li>
      <Link to="/filter/everything">Everything</Link>
    </li>
    <li>
      <Link to="/all-groups">Public groups</Link>
    </li>
    <li>
      <Link to="/support">Support</Link> /{' '}
      <a href="https://github.com/FreeFeed/freefeed-server/wiki/FAQ" target="_blank">
        FAQ
      </a>
    </li>
    <li>
      <Link to="/freefeed">News</Link>
    </li>
    <li>
      <Link to="/about/donate">Donate</Link>
    </li>
  </ul>
);

const SideBarGroups = () => {
  return (
    <div>
      <RecentGroups />

      <div className="box-footer">
        <Link to="/groups">Browse/edit groups</Link>
      </div>
    </div>
  );
};

const SideBarBookmarklet = () => (
  <div>
    <div className="box-footer">
      Once added to your toolbar, this button will let you share web pages on {CONFIG.siteTitle}.
      You can even attach thumbnails of images from the page you share!
    </div>
    <div className="box-footer">
      Click and drag{' '}
      <span
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `<a class="bookmarklet-button" href="${htmlSafe(
            bookmarkletHref(),
          )}" onclick="return false">Share on ${CONFIG.siteTitle}</a>`,
        }}
      />{' '}
      to&nbsp;your toolbar.
    </div>
    <div className="box-footer">
      There is also a{' '}
      <a href="https://chrome.google.com/webstore/detail/share-on-freefeed/dngijpbccpnbjlpjomjmlppfgmnnilah">
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Chrome Extension</span>
      </a>{' '}
      for sharing on {CONFIG.siteTitle}.
    </div>
  </div>
);

const SideBarArchive = ({ user }) => {
  if (!user || !user.privateMeta) {
    return null;
  }
  const { archives } = user.privateMeta;
  if (
    !user ||
    !user.privateMeta ||
    !archives ||
    (archives.recovery_status === 2 && archives.restore_comments_and_likes)
  ) {
    return null;
  }
  return (
    <ul>
      <li>
        <Link to="/settings/archive">Restore your archive!</Link>
      </li>
    </ul>
  );
};

const SideBarAppearance = connect(
  ({ userColorScheme }) => ({ userColorScheme }),
  (dispatch) => ({ onChange: (e) => dispatch(setUserColorScheme(e.target.value)) }),
)(({ userColorScheme, onChange }) => {
  let value = userColorScheme;
  if (!systemColorSchemeSupported && value === SCHEME_SYSTEM) {
    value = SCHEME_LIGHT;
  }
  function handleRowClick(e) {
    const rows = document.querySelectorAll('.theme-row');
    rows.forEach((row) => row.classList.remove('theme-selected'));
    e.target.classList.add('theme-selected');
    onChange({ target: { value: e.target.getAttribute('value') } });
  }

  useEffect(() => {
    const themeBox = document.querySelector('#theme-box');
    const children = themeBox.querySelectorAll('.theme-row');

    for (const child of children) {
      if (child.getAttribute('value') === value) {
        child.className = 'theme-row theme-selected';
        break;
      }
    }
  }, [value]);

  return (
    <div id="theme-box">
      {/* eslint-disable-next-line react/jsx-no-bind */}
      <div value={SCHEME_LIGHT} className="theme-row" onClick={handleRowClick}>
        Light
      </div>
      <div
        value={SCHEME_SYSTEM}
        className={`theme-row ${!systemColorSchemeSupported && 'disabled'}`}
        /* eslint-disable-next-line react/jsx-no-bind */
        onClick={handleRowClick}
      >
        Auto
      </div>
      {/* eslint-disable-next-line react/jsx-no-bind */}
      <div value={SCHEME_DARK} className="theme-row" onClick={handleRowClick}>
        Dark
      </div>
    </div>
  );
});

const SideBarNewPost = () => {
  const newPostDiv = useRef(null);
  const pointerDiv = useRef(null);
  const newPostDialog = useRef(null);
  const [newPost, setNewPost] = useState(false);

  const state = useSelector((state) => state);
  const sendTo = { ...state.sendTo, defaultFeed: state.user.username };
  let leftPos; // declare leftPos variable

  if (newPost) {
    const el = document.querySelector('.footer');
    leftPos = el.getBoundingClientRect().left; // assign leftPos value
  }

  const handleHideNewPostDialog = (bool) => {
    setNewPost(bool);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        newPost &&
        newPostDialog.current &&
        !newPostDialog.current.contains(event.target) &&
        !newPostDiv.current.contains(event.target)
      ) {
        setNewPost(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [newPost]);

  return (
    <div id="newPostDiv" ref={newPostDiv}>
      <div ref={pointerDiv} id="newPostButtonNull" />
      <div
        /* eslint-disable-next-line react/jsx-no-bind */
        onMouseDown={() => {
          setNewPost(!newPost);
        }}
        id="newPostButtonDesktop"
      >
        New Post <Icon icon={faPenToSquare} />
      </div>
      {newPost && (
        <div ref={newPostDialog} className={'new-post'} style={{ left: `${leftPos}px` }}>
          <CreatePost
            /* eslint-disable-next-line react/jsx-no-bind */
            hideNewPostDialog={handleHideNewPostDialog}
            sendTo={sendTo}
            user={state.user}
            createPost={state.createPost}
            resetPostCreateForm={state.resetPostCreateForm}
            addAttachmentResponse={state.addAttachmentResponse}
            showMedia={state.showMedia}
          />
        </div>
      )}
    </div>
  );
};

function CollapsibleSection({ title, collapsed, setCollapsed, children }) {
  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return (
    <div
      style={{ marginBottom: '30px', cursor: 'pointer' }}
      className="box"
      role="region"
      onClick={toggleCollapsed}
    >
      <div className="box-header-groups" role="heading">
        {title}
        <Icon
          style={{ position: 'absolute', right: 20, marginTop: '5px' }}
          icon={collapsed ? faChevronDown : faChevronUp}
        />
      </div>
      {!collapsed && <div className="box-body">{children}</div>}
    </div>
  );
}

export default function SideBar({ user, signOut }) {
  const dispatch = useDispatch();
  const sidebarOpened = useSelector((state) => state.sidebarOpened);
  const [bookmarkletCollapsed, setBookmarkletCollapsed] = useState(true);
  const [groupsCollapsed, setGroupsCollapsed] = useState(true);
  const [archiveCollapsed, setArchiveCollapsed] = useState(true);
  const [freeFeedCollapsed, setFreeFeedCollapsed] = useState(true);
  const [memoriesCollapsed, setMemoriesCollapsed] = useState(true);
  //const state = useSelector((state) => state);
  // const sendTo = { ...state.sendTo, defaultFeed: state.user.username };
  //console.log(sendTo);

  // Sidebar is 'closed' (actually it is always visible) on the wide screens
  const wideScreen = useMediaQuery('(min-width: 992px)');
  useEffect(() => void (wideScreen && dispatch(openSidebar(false))), [wideScreen, dispatch]);

  // Turn off body scrolling while the sidebar is opened
  useEffect(
    () => void document.body.classList.toggle('body--no-scroll', sidebarOpened),
    [sidebarOpened],
  );

  // Reset content's scrollTop when the sidebar opening
  const content = useRef(null);
  useEffect(() => void (sidebarOpened && (content.current.scrollTop = 0)), [sidebarOpened]);

  const clickToCLose = useCallback(
    (e) => {
      if (
        // Click on shadow
        e.target === e.currentTarget ||
        // Click on links
        e.target.closest('a') !== null
      ) {
        dispatch(openSidebar(false));
      }
    },
    [dispatch],
  );

  const resizing = useResizing();
  const closeSidebar = useCallback(() => dispatch(openSidebar(false)), [dispatch]);
  return (
    <div
      className={cn(
        'col-md-3 sidebar',
        resizing && 'sidebar--no-transitions',
        sidebarOpened && 'sidebar--opened',
      )}
      role="complementary"
      onClick={clickToCLose}
    >
      <div className="sidebar__content" ref={content}>
        <ErrorBoundary>
          <button className="sidebar__close-button" onClick={closeSidebar}>
            <Icon icon={faTimes} />
          </button>

          <LoggedInBlock user={user} signOut={signOut} />
          <SideBarFriends user={user} />
          <CollapsibleSection
            title="Groups"
            collapsed={groupsCollapsed}
            setCollapsed={setGroupsCollapsed}
          >
            <SideBarGroups />
          </CollapsibleSection>
          {user.privateMeta && user.privateMeta.archives && (
            <CollapsibleSection
              title="Archive"
              collapsed={archiveCollapsed}
              setCollapsed={setArchiveCollapsed}
            >
              <SideBarArchive user={user} />
            </CollapsibleSection>
          )}
          <CollapsibleSection
            title="FreeFeed"
            collapsed={freeFeedCollapsed}
            setCollapsed={setFreeFeedCollapsed}
          >
            <SideBarFreeFeed />
          </CollapsibleSection>
          <CollapsibleSection
            title="Bookmarklet"
            collapsed={bookmarkletCollapsed}
            setCollapsed={setBookmarkletCollapsed}
          >
            <SideBarBookmarklet />
          </CollapsibleSection>
          <CollapsibleSection
            title="Memories"
            collapsed={memoriesCollapsed}
            setCollapsed={setMemoriesCollapsed}
          >
            <SideBarMemories />
          </CollapsibleSection>
          {wideScreen && <SideBarNewPost />}
          <SideBarAppearance />
        </ErrorBoundary>
      </div>
    </div>
  );
}
