export const translate = async (string) => {
  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbzcUl-UZyKWCQ4K3G8372_QByqnAQPfzOtJQO--9vLFBBWacg-7EutLOlmrQ_fiWd4/exec',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: string,
        }),
      },
    );
    const translatedText = await response.text();
    return translatedText;
  } catch {
    return 'error!';
  }
};
