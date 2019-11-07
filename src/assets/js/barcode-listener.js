
  function bindEvent(element, eventName, eventHandler) {
    if (element.addEventListener) {
        element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
        element.attachEvent('on' + eventName, eventHandler);
    }
  }

  // bindEvent(window, 'message', function (e) {
  //   window.addProductByBarcode(e.data);
  // });
