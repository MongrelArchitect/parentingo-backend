const cookieControl = (() => {
  // used to store session cookie data when test user is created / logged in
  let cookie = "";

  const getCookie = () => {
    return cookie;
  };

  const setCookie = (newCookie: string) => {
    cookie = newCookie;
  };

  return {
    getCookie,
    setCookie,
  };
})();

export default cookieControl;
