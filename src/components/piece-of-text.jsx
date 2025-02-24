import { cloneElement, isValidElement, Component } from 'react';

import { READMORE_STYLE_COMFORT } from '../utils/frontend-preferences-options';

import { StartSpoiler, EndSpoiler } from '../utils/spoiler-tokens';
import { parseText } from '../utils/parse-text';

import Spoiler from './spoiler';
import Linkify from './linkify';
import { ButtonLink } from './button-link';

// Texts longer than thresholdTextLength should be cut to shortenedTextLength
const thresholdTextLength = 800;
const shortenedTextLength = 600;

// Texts with less than thresholdLineBreaks should not be collapsed
const thresholdTextLines = 5;

// Suffix to add to the shortened text
const suffix = '...';

// Separator element for "paragraphs"
const paragraphBreak = (
  <div className="p-break">
    <br />
  </div>
);

// Shorten text without cutting words
const shortenText = (text, maxLength) => {
  if (text.length <= maxLength) {
    return text;
  }

  // Calculate max length taking into account the suffix
  const maxTextLength = maxLength - suffix.length;

  // Find the last space before maxTextLength
  const lastSpacePosition = text.lastIndexOf(' ', maxTextLength + 1);

  // Handle the case with a very long first word (i.e., no spaces before maxTextLength)
  const cutIndex = lastSpacePosition > -1 ? lastSpacePosition : maxTextLength;

  const newText = text.slice(0, Math.max(0, cutIndex));
  return newText + suffix;
};

// Inject an element between every element in array.
// It's similar to array.join(separator), but returns an array, not a string.
const injectSeparator = (array, separator) => {
  if (array.length < 2) {
    return array;
  }

  const result = [];

  array.forEach((item, i) => {
    result.push(<span key={`item-${i}`}>{item}</span>);
    result.push(cloneElement(separator, { key: `separator-${i}` }, separator.props.children));
  });

  result.pop();

  return result;
};

// Replace single newlines with <br/> and trim every line
const brAndTrim = (text) => {
  const lines = text.split(/\n/g).map((line) => line.trim());
  return injectSeparator(lines, <br />);
};

const getCollapsedText = (text, expandText) => {
  const trimmedText = text.trim();
  const normalizedText = trimmedText.replace(/\s+/g, ' ');

  if (normalizedText.length <= thresholdTextLength) {
    if (text.split(/\n/).length < thresholdTextLines) {
      // The text is short and has less than threshold newlines
      return getExpandedText(text);
    }

    // The text is short but has some newlines
    return [
      <span key="text" dir="auto">
        {normalizedText}
      </span>,
      ' ',
      <ButtonLink key="read-more" className="read-more" onClick={expandText}>
        Expand
      </ButtonLink>,
    ];
  }

  // The text is long
  const shortenedText = shortenText(normalizedText, shortenedTextLength);

  return [
    <span key="text" dir="auto">
      {shortenedText}
    </span>,
    ' ',
    <ButtonLink key="read-more" className="read-more" onClick={expandText}>
      Read more
    </ButtonLink>,
  ];
};

const getExpandedText = (text) => {
  const trimmedText = text.trim();

  if (!/\n/.test(trimmedText)) {
    return trimmedText;
  }

  const paragraphs = trimmedText.split(/\n\s*\n/g).map(brAndTrim);

  return injectSeparator(paragraphs, paragraphBreak);
};

const splitIntoSpoilerBlocks = (input) => {
  if (typeof input === 'string') {
    const tokens = parseText(input);

    const newNodes = [];
    let isInSpoiler = false;
    let spoilerText = '';

    tokens.forEach((token) => {
      if (token instanceof StartSpoiler) {
        newNodes.push(token.text);
        isInSpoiler = true;
      } else if (token instanceof EndSpoiler) {
        const spoilerNode = <Spoiler key={`spoiler-${token.offset}`}>{spoilerText}</Spoiler>;
        newNodes.push(spoilerNode, token.text);
        isInSpoiler = false;
        spoilerText = '';
      } else if (isInSpoiler) {
        spoilerText += token.text;
      } else {
        newNodes.push(token.text);
      }
    });

    return newNodes;
  }

  if (Array.isArray(input)) {
    return input.map(splitIntoSpoilerBlocks);
  }

  if (isValidElement(input)) {
    return cloneElement(input, {}, splitIntoSpoilerBlocks(input.props.children));
  }
};

export default class PieceOfText extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: !!props.isExpanded || props.readMoreStyle === READMORE_STYLE_COMFORT,
    };
  }

  expandText() {
    this.setState({ isExpanded: true });
  }

  render() {
    if (!this.props.text) {
      return <span />;
    }

    const text = splitIntoSpoilerBlocks(
      this.state.isExpanded
        ? getExpandedText(this.props.text)
        : getCollapsedText(this.props.text, this.expandText.bind(this)),
    );

    return (
      <Linkify
        userHover={this.props.userHover}
        arrowHover={this.props.arrowHover}
        arrowClick={this.props.arrowClick}
        highlightTerms={this.props.highlightTerms}
        showMedia={this.props.showMedia}
      >
        {text}
      </Linkify>
    );
  }
}
