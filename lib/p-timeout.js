const pTimeout = (duration) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(null);
    }, duration);
  });

export default pTimeout;
