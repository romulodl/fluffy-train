(function (Web3Modal, WalletConnectProvider, sha3, BN$1, hash, bech32) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var Web3Modal__default = /*#__PURE__*/_interopDefaultLegacy(Web3Modal);
    var WalletConnectProvider__default = /*#__PURE__*/_interopDefaultLegacy(WalletConnectProvider);
    var sha3__default = /*#__PURE__*/_interopDefaultLegacy(sha3);
    var BN__default = /*#__PURE__*/_interopDefaultLegacy(BN$1);
    var hash__default = /*#__PURE__*/_interopDefaultLegacy(hash);
    var bech32__default = /*#__PURE__*/_interopDefaultLegacy(bech32);

    /*
    Stimulus 3.0.1
    Copyright © 2021 Basecamp, LLC
     */
    class EventListener {
      constructor(eventTarget, eventName, eventOptions) {
        this.eventTarget = eventTarget;
        this.eventName = eventName;
        this.eventOptions = eventOptions;
        this.unorderedBindings = new Set();
      }

      connect() {
        this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
      }

      disconnect() {
        this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions);
      }

      bindingConnected(binding) {
        this.unorderedBindings.add(binding);
      }

      bindingDisconnected(binding) {
        this.unorderedBindings.delete(binding);
      }

      handleEvent(event) {
        const extendedEvent = extendEvent(event);

        for (const binding of this.bindings) {
          if (extendedEvent.immediatePropagationStopped) {
            break;
          } else {
            binding.handleEvent(extendedEvent);
          }
        }
      }

      get bindings() {
        return Array.from(this.unorderedBindings).sort((left, right) => {
          const leftIndex = left.index,
                rightIndex = right.index;
          return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0;
        });
      }

    }

    function extendEvent(event) {
      if ("immediatePropagationStopped" in event) {
        return event;
      } else {
        const {
          stopImmediatePropagation
        } = event;
        return Object.assign(event, {
          immediatePropagationStopped: false,

          stopImmediatePropagation() {
            this.immediatePropagationStopped = true;
            stopImmediatePropagation.call(this);
          }

        });
      }
    }

    class Dispatcher {
      constructor(application) {
        this.application = application;
        this.eventListenerMaps = new Map();
        this.started = false;
      }

      start() {
        if (!this.started) {
          this.started = true;
          this.eventListeners.forEach(eventListener => eventListener.connect());
        }
      }

      stop() {
        if (this.started) {
          this.started = false;
          this.eventListeners.forEach(eventListener => eventListener.disconnect());
        }
      }

      get eventListeners() {
        return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), []);
      }

      bindingConnected(binding) {
        this.fetchEventListenerForBinding(binding).bindingConnected(binding);
      }

      bindingDisconnected(binding) {
        this.fetchEventListenerForBinding(binding).bindingDisconnected(binding);
      }

      handleError(error, message, detail = {}) {
        this.application.handleError(error, `Error ${message}`, detail);
      }

      fetchEventListenerForBinding(binding) {
        const {
          eventTarget,
          eventName,
          eventOptions
        } = binding;
        return this.fetchEventListener(eventTarget, eventName, eventOptions);
      }

      fetchEventListener(eventTarget, eventName, eventOptions) {
        const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
        const cacheKey = this.cacheKey(eventName, eventOptions);
        let eventListener = eventListenerMap.get(cacheKey);

        if (!eventListener) {
          eventListener = this.createEventListener(eventTarget, eventName, eventOptions);
          eventListenerMap.set(cacheKey, eventListener);
        }

        return eventListener;
      }

      createEventListener(eventTarget, eventName, eventOptions) {
        const eventListener = new EventListener(eventTarget, eventName, eventOptions);

        if (this.started) {
          eventListener.connect();
        }

        return eventListener;
      }

      fetchEventListenerMapForEventTarget(eventTarget) {
        let eventListenerMap = this.eventListenerMaps.get(eventTarget);

        if (!eventListenerMap) {
          eventListenerMap = new Map();
          this.eventListenerMaps.set(eventTarget, eventListenerMap);
        }

        return eventListenerMap;
      }

      cacheKey(eventName, eventOptions) {
        const parts = [eventName];
        Object.keys(eventOptions).sort().forEach(key => {
          parts.push(`${eventOptions[key] ? "" : "!"}${key}`);
        });
        return parts.join(":");
      }

    }

    const descriptorPattern = /^((.+?)(@(window|document))?->)?(.+?)(#([^:]+?))(:(.+))?$/;

    function parseActionDescriptorString(descriptorString) {
      const source = descriptorString.trim();
      const matches = source.match(descriptorPattern) || [];
      return {
        eventTarget: parseEventTarget(matches[4]),
        eventName: matches[2],
        eventOptions: matches[9] ? parseEventOptions(matches[9]) : {},
        identifier: matches[5],
        methodName: matches[7]
      };
    }

    function parseEventTarget(eventTargetName) {
      if (eventTargetName == "window") {
        return window;
      } else if (eventTargetName == "document") {
        return document;
      }
    }

    function parseEventOptions(eventOptions) {
      return eventOptions.split(":").reduce((options, token) => Object.assign(options, {
        [token.replace(/^!/, "")]: !/^!/.test(token)
      }), {});
    }

    function stringifyEventTarget(eventTarget) {
      if (eventTarget == window) {
        return "window";
      } else if (eventTarget == document) {
        return "document";
      }
    }

    function camelize(value) {
      return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase());
    }

    function capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function dasherize(value) {
      return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);
    }

    function tokenize(value) {
      return value.match(/[^\s]+/g) || [];
    }

    class Action {
      constructor(element, index, descriptor) {
        this.element = element;
        this.index = index;
        this.eventTarget = descriptor.eventTarget || element;
        this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error("missing event name");
        this.eventOptions = descriptor.eventOptions || {};
        this.identifier = descriptor.identifier || error("missing identifier");
        this.methodName = descriptor.methodName || error("missing method name");
      }

      static forToken(token) {
        return new this(token.element, token.index, parseActionDescriptorString(token.content));
      }

      toString() {
        const eventNameSuffix = this.eventTargetName ? `@${this.eventTargetName}` : "";
        return `${this.eventName}${eventNameSuffix}->${this.identifier}#${this.methodName}`;
      }

      get params() {
        if (this.eventTarget instanceof Element) {
          return this.getParamsFromEventTargetAttributes(this.eventTarget);
        } else {
          return {};
        }
      }

      getParamsFromEventTargetAttributes(eventTarget) {
        const params = {};
        const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`);
        const attributes = Array.from(eventTarget.attributes);
        attributes.forEach(({
          name,
          value
        }) => {
          const match = name.match(pattern);
          const key = match && match[1];

          if (key) {
            Object.assign(params, {
              [camelize(key)]: typecast(value)
            });
          }
        });
        return params;
      }

      get eventTargetName() {
        return stringifyEventTarget(this.eventTarget);
      }

    }

    const defaultEventNames = {
      "a": e => "click",
      "button": e => "click",
      "form": e => "submit",
      "details": e => "toggle",
      "input": e => e.getAttribute("type") == "submit" ? "click" : "input",
      "select": e => "change",
      "textarea": e => "input"
    };

    function getDefaultEventNameForElement(element) {
      const tagName = element.tagName.toLowerCase();

      if (tagName in defaultEventNames) {
        return defaultEventNames[tagName](element);
      }
    }

    function error(message) {
      throw new Error(message);
    }

    function typecast(value) {
      try {
        return JSON.parse(value);
      } catch (o_O) {
        return value;
      }
    }

    class Binding {
      constructor(context, action) {
        this.context = context;
        this.action = action;
      }

      get index() {
        return this.action.index;
      }

      get eventTarget() {
        return this.action.eventTarget;
      }

      get eventOptions() {
        return this.action.eventOptions;
      }

      get identifier() {
        return this.context.identifier;
      }

      handleEvent(event) {
        if (this.willBeInvokedByEvent(event)) {
          this.invokeWithEvent(event);
        }
      }

      get eventName() {
        return this.action.eventName;
      }

      get method() {
        const method = this.controller[this.methodName];

        if (typeof method == "function") {
          return method;
        }

        throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`);
      }

      invokeWithEvent(event) {
        const {
          target,
          currentTarget
        } = event;

        try {
          const {
            params
          } = this.action;
          const actionEvent = Object.assign(event, {
            params
          });
          this.method.call(this.controller, actionEvent);
          this.context.logDebugActivity(this.methodName, {
            event,
            target,
            currentTarget,
            action: this.methodName
          });
        } catch (error) {
          const {
            identifier,
            controller,
            element,
            index
          } = this;
          const detail = {
            identifier,
            controller,
            element,
            index,
            event
          };
          this.context.handleError(error, `invoking action "${this.action}"`, detail);
        }
      }

      willBeInvokedByEvent(event) {
        const eventTarget = event.target;

        if (this.element === eventTarget) {
          return true;
        } else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
          return this.scope.containsElement(eventTarget);
        } else {
          return this.scope.containsElement(this.action.element);
        }
      }

      get controller() {
        return this.context.controller;
      }

      get methodName() {
        return this.action.methodName;
      }

      get element() {
        return this.scope.element;
      }

      get scope() {
        return this.context.scope;
      }

    }

    class ElementObserver {
      constructor(element, delegate) {
        this.mutationObserverInit = {
          attributes: true,
          childList: true,
          subtree: true
        };
        this.element = element;
        this.started = false;
        this.delegate = delegate;
        this.elements = new Set();
        this.mutationObserver = new MutationObserver(mutations => this.processMutations(mutations));
      }

      start() {
        if (!this.started) {
          this.started = true;
          this.mutationObserver.observe(this.element, this.mutationObserverInit);
          this.refresh();
        }
      }

      pause(callback) {
        if (this.started) {
          this.mutationObserver.disconnect();
          this.started = false;
        }

        callback();

        if (!this.started) {
          this.mutationObserver.observe(this.element, this.mutationObserverInit);
          this.started = true;
        }
      }

      stop() {
        if (this.started) {
          this.mutationObserver.takeRecords();
          this.mutationObserver.disconnect();
          this.started = false;
        }
      }

      refresh() {
        if (this.started) {
          const matches = new Set(this.matchElementsInTree());

          for (const element of Array.from(this.elements)) {
            if (!matches.has(element)) {
              this.removeElement(element);
            }
          }

          for (const element of Array.from(matches)) {
            this.addElement(element);
          }
        }
      }

      processMutations(mutations) {
        if (this.started) {
          for (const mutation of mutations) {
            this.processMutation(mutation);
          }
        }
      }

      processMutation(mutation) {
        if (mutation.type == "attributes") {
          this.processAttributeChange(mutation.target, mutation.attributeName);
        } else if (mutation.type == "childList") {
          this.processRemovedNodes(mutation.removedNodes);
          this.processAddedNodes(mutation.addedNodes);
        }
      }

      processAttributeChange(node, attributeName) {
        const element = node;

        if (this.elements.has(element)) {
          if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
            this.delegate.elementAttributeChanged(element, attributeName);
          } else {
            this.removeElement(element);
          }
        } else if (this.matchElement(element)) {
          this.addElement(element);
        }
      }

      processRemovedNodes(nodes) {
        for (const node of Array.from(nodes)) {
          const element = this.elementFromNode(node);

          if (element) {
            this.processTree(element, this.removeElement);
          }
        }
      }

      processAddedNodes(nodes) {
        for (const node of Array.from(nodes)) {
          const element = this.elementFromNode(node);

          if (element && this.elementIsActive(element)) {
            this.processTree(element, this.addElement);
          }
        }
      }

      matchElement(element) {
        return this.delegate.matchElement(element);
      }

      matchElementsInTree(tree = this.element) {
        return this.delegate.matchElementsInTree(tree);
      }

      processTree(tree, processor) {
        for (const element of this.matchElementsInTree(tree)) {
          processor.call(this, element);
        }
      }

      elementFromNode(node) {
        if (node.nodeType == Node.ELEMENT_NODE) {
          return node;
        }
      }

      elementIsActive(element) {
        if (element.isConnected != this.element.isConnected) {
          return false;
        } else {
          return this.element.contains(element);
        }
      }

      addElement(element) {
        if (!this.elements.has(element)) {
          if (this.elementIsActive(element)) {
            this.elements.add(element);

            if (this.delegate.elementMatched) {
              this.delegate.elementMatched(element);
            }
          }
        }
      }

      removeElement(element) {
        if (this.elements.has(element)) {
          this.elements.delete(element);

          if (this.delegate.elementUnmatched) {
            this.delegate.elementUnmatched(element);
          }
        }
      }

    }

    class AttributeObserver {
      constructor(element, attributeName, delegate) {
        this.attributeName = attributeName;
        this.delegate = delegate;
        this.elementObserver = new ElementObserver(element, this);
      }

      get element() {
        return this.elementObserver.element;
      }

      get selector() {
        return `[${this.attributeName}]`;
      }

      start() {
        this.elementObserver.start();
      }

      pause(callback) {
        this.elementObserver.pause(callback);
      }

      stop() {
        this.elementObserver.stop();
      }

      refresh() {
        this.elementObserver.refresh();
      }

      get started() {
        return this.elementObserver.started;
      }

      matchElement(element) {
        return element.hasAttribute(this.attributeName);
      }

      matchElementsInTree(tree) {
        const match = this.matchElement(tree) ? [tree] : [];
        const matches = Array.from(tree.querySelectorAll(this.selector));
        return match.concat(matches);
      }

      elementMatched(element) {
        if (this.delegate.elementMatchedAttribute) {
          this.delegate.elementMatchedAttribute(element, this.attributeName);
        }
      }

      elementUnmatched(element) {
        if (this.delegate.elementUnmatchedAttribute) {
          this.delegate.elementUnmatchedAttribute(element, this.attributeName);
        }
      }

      elementAttributeChanged(element, attributeName) {
        if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
          this.delegate.elementAttributeValueChanged(element, attributeName);
        }
      }

    }

    class StringMapObserver {
      constructor(element, delegate) {
        this.element = element;
        this.delegate = delegate;
        this.started = false;
        this.stringMap = new Map();
        this.mutationObserver = new MutationObserver(mutations => this.processMutations(mutations));
      }

      start() {
        if (!this.started) {
          this.started = true;
          this.mutationObserver.observe(this.element, {
            attributes: true,
            attributeOldValue: true
          });
          this.refresh();
        }
      }

      stop() {
        if (this.started) {
          this.mutationObserver.takeRecords();
          this.mutationObserver.disconnect();
          this.started = false;
        }
      }

      refresh() {
        if (this.started) {
          for (const attributeName of this.knownAttributeNames) {
            this.refreshAttribute(attributeName, null);
          }
        }
      }

      processMutations(mutations) {
        if (this.started) {
          for (const mutation of mutations) {
            this.processMutation(mutation);
          }
        }
      }

      processMutation(mutation) {
        const attributeName = mutation.attributeName;

        if (attributeName) {
          this.refreshAttribute(attributeName, mutation.oldValue);
        }
      }

      refreshAttribute(attributeName, oldValue) {
        const key = this.delegate.getStringMapKeyForAttribute(attributeName);

        if (key != null) {
          if (!this.stringMap.has(attributeName)) {
            this.stringMapKeyAdded(key, attributeName);
          }

          const value = this.element.getAttribute(attributeName);

          if (this.stringMap.get(attributeName) != value) {
            this.stringMapValueChanged(value, key, oldValue);
          }

          if (value == null) {
            const oldValue = this.stringMap.get(attributeName);
            this.stringMap.delete(attributeName);
            if (oldValue) this.stringMapKeyRemoved(key, attributeName, oldValue);
          } else {
            this.stringMap.set(attributeName, value);
          }
        }
      }

      stringMapKeyAdded(key, attributeName) {
        if (this.delegate.stringMapKeyAdded) {
          this.delegate.stringMapKeyAdded(key, attributeName);
        }
      }

      stringMapValueChanged(value, key, oldValue) {
        if (this.delegate.stringMapValueChanged) {
          this.delegate.stringMapValueChanged(value, key, oldValue);
        }
      }

      stringMapKeyRemoved(key, attributeName, oldValue) {
        if (this.delegate.stringMapKeyRemoved) {
          this.delegate.stringMapKeyRemoved(key, attributeName, oldValue);
        }
      }

      get knownAttributeNames() {
        return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)));
      }

      get currentAttributeNames() {
        return Array.from(this.element.attributes).map(attribute => attribute.name);
      }

      get recordedAttributeNames() {
        return Array.from(this.stringMap.keys());
      }

    }

    function add(map, key, value) {
      fetch$1(map, key).add(value);
    }

    function del(map, key, value) {
      fetch$1(map, key).delete(value);
      prune(map, key);
    }

    function fetch$1(map, key) {
      let values = map.get(key);

      if (!values) {
        values = new Set();
        map.set(key, values);
      }

      return values;
    }

    function prune(map, key) {
      const values = map.get(key);

      if (values != null && values.size == 0) {
        map.delete(key);
      }
    }

    class Multimap {
      constructor() {
        this.valuesByKey = new Map();
      }

      get keys() {
        return Array.from(this.valuesByKey.keys());
      }

      get values() {
        const sets = Array.from(this.valuesByKey.values());
        return sets.reduce((values, set) => values.concat(Array.from(set)), []);
      }

      get size() {
        const sets = Array.from(this.valuesByKey.values());
        return sets.reduce((size, set) => size + set.size, 0);
      }

      add(key, value) {
        add(this.valuesByKey, key, value);
      }

      delete(key, value) {
        del(this.valuesByKey, key, value);
      }

      has(key, value) {
        const values = this.valuesByKey.get(key);
        return values != null && values.has(value);
      }

      hasKey(key) {
        return this.valuesByKey.has(key);
      }

      hasValue(value) {
        const sets = Array.from(this.valuesByKey.values());
        return sets.some(set => set.has(value));
      }

      getValuesForKey(key) {
        const values = this.valuesByKey.get(key);
        return values ? Array.from(values) : [];
      }

      getKeysForValue(value) {
        return Array.from(this.valuesByKey).filter(([key, values]) => values.has(value)).map(([key, values]) => key);
      }

    }

    class TokenListObserver {
      constructor(element, attributeName, delegate) {
        this.attributeObserver = new AttributeObserver(element, attributeName, this);
        this.delegate = delegate;
        this.tokensByElement = new Multimap();
      }

      get started() {
        return this.attributeObserver.started;
      }

      start() {
        this.attributeObserver.start();
      }

      pause(callback) {
        this.attributeObserver.pause(callback);
      }

      stop() {
        this.attributeObserver.stop();
      }

      refresh() {
        this.attributeObserver.refresh();
      }

      get element() {
        return this.attributeObserver.element;
      }

      get attributeName() {
        return this.attributeObserver.attributeName;
      }

      elementMatchedAttribute(element) {
        this.tokensMatched(this.readTokensForElement(element));
      }

      elementAttributeValueChanged(element) {
        const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element);
        this.tokensUnmatched(unmatchedTokens);
        this.tokensMatched(matchedTokens);
      }

      elementUnmatchedAttribute(element) {
        this.tokensUnmatched(this.tokensByElement.getValuesForKey(element));
      }

      tokensMatched(tokens) {
        tokens.forEach(token => this.tokenMatched(token));
      }

      tokensUnmatched(tokens) {
        tokens.forEach(token => this.tokenUnmatched(token));
      }

      tokenMatched(token) {
        this.delegate.tokenMatched(token);
        this.tokensByElement.add(token.element, token);
      }

      tokenUnmatched(token) {
        this.delegate.tokenUnmatched(token);
        this.tokensByElement.delete(token.element, token);
      }

      refreshTokensForElement(element) {
        const previousTokens = this.tokensByElement.getValuesForKey(element);
        const currentTokens = this.readTokensForElement(element);
        const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken));

        if (firstDifferingIndex == -1) {
          return [[], []];
        } else {
          return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)];
        }
      }

      readTokensForElement(element) {
        const attributeName = this.attributeName;
        const tokenString = element.getAttribute(attributeName) || "";
        return parseTokenString(tokenString, element, attributeName);
      }

    }

    function parseTokenString(tokenString, element, attributeName) {
      return tokenString.trim().split(/\s+/).filter(content => content.length).map((content, index) => ({
        element,
        attributeName,
        content,
        index
      }));
    }

    function zip(left, right) {
      const length = Math.max(left.length, right.length);
      return Array.from({
        length
      }, (_, index) => [left[index], right[index]]);
    }

    function tokensAreEqual(left, right) {
      return left && right && left.index == right.index && left.content == right.content;
    }

    class ValueListObserver {
      constructor(element, attributeName, delegate) {
        this.tokenListObserver = new TokenListObserver(element, attributeName, this);
        this.delegate = delegate;
        this.parseResultsByToken = new WeakMap();
        this.valuesByTokenByElement = new WeakMap();
      }

      get started() {
        return this.tokenListObserver.started;
      }

      start() {
        this.tokenListObserver.start();
      }

      stop() {
        this.tokenListObserver.stop();
      }

      refresh() {
        this.tokenListObserver.refresh();
      }

      get element() {
        return this.tokenListObserver.element;
      }

      get attributeName() {
        return this.tokenListObserver.attributeName;
      }

      tokenMatched(token) {
        const {
          element
        } = token;
        const {
          value
        } = this.fetchParseResultForToken(token);

        if (value) {
          this.fetchValuesByTokenForElement(element).set(token, value);
          this.delegate.elementMatchedValue(element, value);
        }
      }

      tokenUnmatched(token) {
        const {
          element
        } = token;
        const {
          value
        } = this.fetchParseResultForToken(token);

        if (value) {
          this.fetchValuesByTokenForElement(element).delete(token);
          this.delegate.elementUnmatchedValue(element, value);
        }
      }

      fetchParseResultForToken(token) {
        let parseResult = this.parseResultsByToken.get(token);

        if (!parseResult) {
          parseResult = this.parseToken(token);
          this.parseResultsByToken.set(token, parseResult);
        }

        return parseResult;
      }

      fetchValuesByTokenForElement(element) {
        let valuesByToken = this.valuesByTokenByElement.get(element);

        if (!valuesByToken) {
          valuesByToken = new Map();
          this.valuesByTokenByElement.set(element, valuesByToken);
        }

        return valuesByToken;
      }

      parseToken(token) {
        try {
          const value = this.delegate.parseValueForToken(token);
          return {
            value
          };
        } catch (error) {
          return {
            error
          };
        }
      }

    }

    class BindingObserver {
      constructor(context, delegate) {
        this.context = context;
        this.delegate = delegate;
        this.bindingsByAction = new Map();
      }

      start() {
        if (!this.valueListObserver) {
          this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this);
          this.valueListObserver.start();
        }
      }

      stop() {
        if (this.valueListObserver) {
          this.valueListObserver.stop();
          delete this.valueListObserver;
          this.disconnectAllActions();
        }
      }

      get element() {
        return this.context.element;
      }

      get identifier() {
        return this.context.identifier;
      }

      get actionAttribute() {
        return this.schema.actionAttribute;
      }

      get schema() {
        return this.context.schema;
      }

      get bindings() {
        return Array.from(this.bindingsByAction.values());
      }

      connectAction(action) {
        const binding = new Binding(this.context, action);
        this.bindingsByAction.set(action, binding);
        this.delegate.bindingConnected(binding);
      }

      disconnectAction(action) {
        const binding = this.bindingsByAction.get(action);

        if (binding) {
          this.bindingsByAction.delete(action);
          this.delegate.bindingDisconnected(binding);
        }
      }

      disconnectAllActions() {
        this.bindings.forEach(binding => this.delegate.bindingDisconnected(binding));
        this.bindingsByAction.clear();
      }

      parseValueForToken(token) {
        const action = Action.forToken(token);

        if (action.identifier == this.identifier) {
          return action;
        }
      }

      elementMatchedValue(element, action) {
        this.connectAction(action);
      }

      elementUnmatchedValue(element, action) {
        this.disconnectAction(action);
      }

    }

    class ValueObserver {
      constructor(context, receiver) {
        this.context = context;
        this.receiver = receiver;
        this.stringMapObserver = new StringMapObserver(this.element, this);
        this.valueDescriptorMap = this.controller.valueDescriptorMap;
        this.invokeChangedCallbacksForDefaultValues();
      }

      start() {
        this.stringMapObserver.start();
      }

      stop() {
        this.stringMapObserver.stop();
      }

      get element() {
        return this.context.element;
      }

      get controller() {
        return this.context.controller;
      }

      getStringMapKeyForAttribute(attributeName) {
        if (attributeName in this.valueDescriptorMap) {
          return this.valueDescriptorMap[attributeName].name;
        }
      }

      stringMapKeyAdded(key, attributeName) {
        const descriptor = this.valueDescriptorMap[attributeName];

        if (!this.hasValue(key)) {
          this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue));
        }
      }

      stringMapValueChanged(value, name, oldValue) {
        const descriptor = this.valueDescriptorNameMap[name];
        if (value === null) return;

        if (oldValue === null) {
          oldValue = descriptor.writer(descriptor.defaultValue);
        }

        this.invokeChangedCallback(name, value, oldValue);
      }

      stringMapKeyRemoved(key, attributeName, oldValue) {
        const descriptor = this.valueDescriptorNameMap[key];

        if (this.hasValue(key)) {
          this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue);
        } else {
          this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue);
        }
      }

      invokeChangedCallbacksForDefaultValues() {
        for (const {
          key,
          name,
          defaultValue,
          writer
        } of this.valueDescriptors) {
          if (defaultValue != undefined && !this.controller.data.has(key)) {
            this.invokeChangedCallback(name, writer(defaultValue), undefined);
          }
        }
      }

      invokeChangedCallback(name, rawValue, rawOldValue) {
        const changedMethodName = `${name}Changed`;
        const changedMethod = this.receiver[changedMethodName];

        if (typeof changedMethod == "function") {
          const descriptor = this.valueDescriptorNameMap[name];
          const value = descriptor.reader(rawValue);
          let oldValue = rawOldValue;

          if (rawOldValue) {
            oldValue = descriptor.reader(rawOldValue);
          }

          changedMethod.call(this.receiver, value, oldValue);
        }
      }

      get valueDescriptors() {
        const {
          valueDescriptorMap
        } = this;
        return Object.keys(valueDescriptorMap).map(key => valueDescriptorMap[key]);
      }

      get valueDescriptorNameMap() {
        const descriptors = {};
        Object.keys(this.valueDescriptorMap).forEach(key => {
          const descriptor = this.valueDescriptorMap[key];
          descriptors[descriptor.name] = descriptor;
        });
        return descriptors;
      }

      hasValue(attributeName) {
        const descriptor = this.valueDescriptorNameMap[attributeName];
        const hasMethodName = `has${capitalize(descriptor.name)}`;
        return this.receiver[hasMethodName];
      }

    }

    class TargetObserver {
      constructor(context, delegate) {
        this.context = context;
        this.delegate = delegate;
        this.targetsByName = new Multimap();
      }

      start() {
        if (!this.tokenListObserver) {
          this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this);
          this.tokenListObserver.start();
        }
      }

      stop() {
        if (this.tokenListObserver) {
          this.disconnectAllTargets();
          this.tokenListObserver.stop();
          delete this.tokenListObserver;
        }
      }

      tokenMatched({
        element,
        content: name
      }) {
        if (this.scope.containsElement(element)) {
          this.connectTarget(element, name);
        }
      }

      tokenUnmatched({
        element,
        content: name
      }) {
        this.disconnectTarget(element, name);
      }

      connectTarget(element, name) {
        var _a;

        if (!this.targetsByName.has(name, element)) {
          this.targetsByName.add(name, element);
          (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetConnected(element, name));
        }
      }

      disconnectTarget(element, name) {
        var _a;

        if (this.targetsByName.has(name, element)) {
          this.targetsByName.delete(name, element);
          (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetDisconnected(element, name));
        }
      }

      disconnectAllTargets() {
        for (const name of this.targetsByName.keys) {
          for (const element of this.targetsByName.getValuesForKey(name)) {
            this.disconnectTarget(element, name);
          }
        }
      }

      get attributeName() {
        return `data-${this.context.identifier}-target`;
      }

      get element() {
        return this.context.element;
      }

      get scope() {
        return this.context.scope;
      }

    }

    class Context {
      constructor(module, scope) {
        this.logDebugActivity = (functionName, detail = {}) => {
          const {
            identifier,
            controller,
            element
          } = this;
          detail = Object.assign({
            identifier,
            controller,
            element
          }, detail);
          this.application.logDebugActivity(this.identifier, functionName, detail);
        };

        this.module = module;
        this.scope = scope;
        this.controller = new module.controllerConstructor(this);
        this.bindingObserver = new BindingObserver(this, this.dispatcher);
        this.valueObserver = new ValueObserver(this, this.controller);
        this.targetObserver = new TargetObserver(this, this);

        try {
          this.controller.initialize();
          this.logDebugActivity("initialize");
        } catch (error) {
          this.handleError(error, "initializing controller");
        }
      }

      connect() {
        this.bindingObserver.start();
        this.valueObserver.start();
        this.targetObserver.start();

        try {
          this.controller.connect();
          this.logDebugActivity("connect");
        } catch (error) {
          this.handleError(error, "connecting controller");
        }
      }

      disconnect() {
        try {
          this.controller.disconnect();
          this.logDebugActivity("disconnect");
        } catch (error) {
          this.handleError(error, "disconnecting controller");
        }

        this.targetObserver.stop();
        this.valueObserver.stop();
        this.bindingObserver.stop();
      }

      get application() {
        return this.module.application;
      }

      get identifier() {
        return this.module.identifier;
      }

      get schema() {
        return this.application.schema;
      }

      get dispatcher() {
        return this.application.dispatcher;
      }

      get element() {
        return this.scope.element;
      }

      get parentElement() {
        return this.element.parentElement;
      }

      handleError(error, message, detail = {}) {
        const {
          identifier,
          controller,
          element
        } = this;
        detail = Object.assign({
          identifier,
          controller,
          element
        }, detail);
        this.application.handleError(error, `Error ${message}`, detail);
      }

      targetConnected(element, name) {
        this.invokeControllerMethod(`${name}TargetConnected`, element);
      }

      targetDisconnected(element, name) {
        this.invokeControllerMethod(`${name}TargetDisconnected`, element);
      }

      invokeControllerMethod(methodName, ...args) {
        const controller = this.controller;

        if (typeof controller[methodName] == "function") {
          controller[methodName](...args);
        }
      }

    }

    function readInheritableStaticArrayValues(constructor, propertyName) {
      const ancestors = getAncestorsForConstructor(constructor);
      return Array.from(ancestors.reduce((values, constructor) => {
        getOwnStaticArrayValues(constructor, propertyName).forEach(name => values.add(name));
        return values;
      }, new Set()));
    }

    function readInheritableStaticObjectPairs(constructor, propertyName) {
      const ancestors = getAncestorsForConstructor(constructor);
      return ancestors.reduce((pairs, constructor) => {
        pairs.push(...getOwnStaticObjectPairs(constructor, propertyName));
        return pairs;
      }, []);
    }

    function getAncestorsForConstructor(constructor) {
      const ancestors = [];

      while (constructor) {
        ancestors.push(constructor);
        constructor = Object.getPrototypeOf(constructor);
      }

      return ancestors.reverse();
    }

    function getOwnStaticArrayValues(constructor, propertyName) {
      const definition = constructor[propertyName];
      return Array.isArray(definition) ? definition : [];
    }

    function getOwnStaticObjectPairs(constructor, propertyName) {
      const definition = constructor[propertyName];
      return definition ? Object.keys(definition).map(key => [key, definition[key]]) : [];
    }

    function bless(constructor) {
      return shadow(constructor, getBlessedProperties(constructor));
    }

    function shadow(constructor, properties) {
      const shadowConstructor = extend(constructor);
      const shadowProperties = getShadowProperties(constructor.prototype, properties);
      Object.defineProperties(shadowConstructor.prototype, shadowProperties);
      return shadowConstructor;
    }

    function getBlessedProperties(constructor) {
      const blessings = readInheritableStaticArrayValues(constructor, "blessings");
      return blessings.reduce((blessedProperties, blessing) => {
        const properties = blessing(constructor);

        for (const key in properties) {
          const descriptor = blessedProperties[key] || {};
          blessedProperties[key] = Object.assign(descriptor, properties[key]);
        }

        return blessedProperties;
      }, {});
    }

    function getShadowProperties(prototype, properties) {
      return getOwnKeys(properties).reduce((shadowProperties, key) => {
        const descriptor = getShadowedDescriptor(prototype, properties, key);

        if (descriptor) {
          Object.assign(shadowProperties, {
            [key]: descriptor
          });
        }

        return shadowProperties;
      }, {});
    }

    function getShadowedDescriptor(prototype, properties, key) {
      const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key);
      const shadowedByValue = shadowingDescriptor && "value" in shadowingDescriptor;

      if (!shadowedByValue) {
        const descriptor = Object.getOwnPropertyDescriptor(properties, key).value;

        if (shadowingDescriptor) {
          descriptor.get = shadowingDescriptor.get || descriptor.get;
          descriptor.set = shadowingDescriptor.set || descriptor.set;
        }

        return descriptor;
      }
    }

    const getOwnKeys = (() => {
      if (typeof Object.getOwnPropertySymbols == "function") {
        return object => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)];
      } else {
        return Object.getOwnPropertyNames;
      }
    })();

    const extend = (() => {
      function extendWithReflect(constructor) {
        function extended() {
          return Reflect.construct(constructor, arguments, new.target);
        }

        extended.prototype = Object.create(constructor.prototype, {
          constructor: {
            value: extended
          }
        });
        Reflect.setPrototypeOf(extended, constructor);
        return extended;
      }

      function testReflectExtension() {
        const a = function () {
          this.a.call(this);
        };

        const b = extendWithReflect(a);

        b.prototype.a = function () {};

        return new b();
      }

      try {
        testReflectExtension();
        return extendWithReflect;
      } catch (error) {
        return constructor => class extended extends constructor {};
      }
    })();

    function blessDefinition(definition) {
      return {
        identifier: definition.identifier,
        controllerConstructor: bless(definition.controllerConstructor)
      };
    }

    class Module {
      constructor(application, definition) {
        this.application = application;
        this.definition = blessDefinition(definition);
        this.contextsByScope = new WeakMap();
        this.connectedContexts = new Set();
      }

      get identifier() {
        return this.definition.identifier;
      }

      get controllerConstructor() {
        return this.definition.controllerConstructor;
      }

      get contexts() {
        return Array.from(this.connectedContexts);
      }

      connectContextForScope(scope) {
        const context = this.fetchContextForScope(scope);
        this.connectedContexts.add(context);
        context.connect();
      }

      disconnectContextForScope(scope) {
        const context = this.contextsByScope.get(scope);

        if (context) {
          this.connectedContexts.delete(context);
          context.disconnect();
        }
      }

      fetchContextForScope(scope) {
        let context = this.contextsByScope.get(scope);

        if (!context) {
          context = new Context(this, scope);
          this.contextsByScope.set(scope, context);
        }

        return context;
      }

    }

    class ClassMap {
      constructor(scope) {
        this.scope = scope;
      }

      has(name) {
        return this.data.has(this.getDataKey(name));
      }

      get(name) {
        return this.getAll(name)[0];
      }

      getAll(name) {
        const tokenString = this.data.get(this.getDataKey(name)) || "";
        return tokenize(tokenString);
      }

      getAttributeName(name) {
        return this.data.getAttributeNameForKey(this.getDataKey(name));
      }

      getDataKey(name) {
        return `${name}-class`;
      }

      get data() {
        return this.scope.data;
      }

    }

    class DataMap {
      constructor(scope) {
        this.scope = scope;
      }

      get element() {
        return this.scope.element;
      }

      get identifier() {
        return this.scope.identifier;
      }

      get(key) {
        const name = this.getAttributeNameForKey(key);
        return this.element.getAttribute(name);
      }

      set(key, value) {
        const name = this.getAttributeNameForKey(key);
        this.element.setAttribute(name, value);
        return this.get(key);
      }

      has(key) {
        const name = this.getAttributeNameForKey(key);
        return this.element.hasAttribute(name);
      }

      delete(key) {
        if (this.has(key)) {
          const name = this.getAttributeNameForKey(key);
          this.element.removeAttribute(name);
          return true;
        } else {
          return false;
        }
      }

      getAttributeNameForKey(key) {
        return `data-${this.identifier}-${dasherize(key)}`;
      }

    }

    class Guide {
      constructor(logger) {
        this.warnedKeysByObject = new WeakMap();
        this.logger = logger;
      }

      warn(object, key, message) {
        let warnedKeys = this.warnedKeysByObject.get(object);

        if (!warnedKeys) {
          warnedKeys = new Set();
          this.warnedKeysByObject.set(object, warnedKeys);
        }

        if (!warnedKeys.has(key)) {
          warnedKeys.add(key);
          this.logger.warn(message, object);
        }
      }

    }

    function attributeValueContainsToken(attributeName, token) {
      return `[${attributeName}~="${token}"]`;
    }

    class TargetSet {
      constructor(scope) {
        this.scope = scope;
      }

      get element() {
        return this.scope.element;
      }

      get identifier() {
        return this.scope.identifier;
      }

      get schema() {
        return this.scope.schema;
      }

      has(targetName) {
        return this.find(targetName) != null;
      }

      find(...targetNames) {
        return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), undefined);
      }

      findAll(...targetNames) {
        return targetNames.reduce((targets, targetName) => [...targets, ...this.findAllTargets(targetName), ...this.findAllLegacyTargets(targetName)], []);
      }

      findTarget(targetName) {
        const selector = this.getSelectorForTargetName(targetName);
        return this.scope.findElement(selector);
      }

      findAllTargets(targetName) {
        const selector = this.getSelectorForTargetName(targetName);
        return this.scope.findAllElements(selector);
      }

      getSelectorForTargetName(targetName) {
        const attributeName = this.schema.targetAttributeForScope(this.identifier);
        return attributeValueContainsToken(attributeName, targetName);
      }

      findLegacyTarget(targetName) {
        const selector = this.getLegacySelectorForTargetName(targetName);
        return this.deprecate(this.scope.findElement(selector), targetName);
      }

      findAllLegacyTargets(targetName) {
        const selector = this.getLegacySelectorForTargetName(targetName);
        return this.scope.findAllElements(selector).map(element => this.deprecate(element, targetName));
      }

      getLegacySelectorForTargetName(targetName) {
        const targetDescriptor = `${this.identifier}.${targetName}`;
        return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor);
      }

      deprecate(element, targetName) {
        if (element) {
          const {
            identifier
          } = this;
          const attributeName = this.schema.targetAttribute;
          const revisedAttributeName = this.schema.targetAttributeForScope(identifier);
          this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". ` + `The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`);
        }

        return element;
      }

      get guide() {
        return this.scope.guide;
      }

    }

    class Scope {
      constructor(schema, element, identifier, logger) {
        this.targets = new TargetSet(this);
        this.classes = new ClassMap(this);
        this.data = new DataMap(this);

        this.containsElement = element => {
          return element.closest(this.controllerSelector) === this.element;
        };

        this.schema = schema;
        this.element = element;
        this.identifier = identifier;
        this.guide = new Guide(logger);
      }

      findElement(selector) {
        return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement);
      }

      findAllElements(selector) {
        return [...(this.element.matches(selector) ? [this.element] : []), ...this.queryElements(selector).filter(this.containsElement)];
      }

      queryElements(selector) {
        return Array.from(this.element.querySelectorAll(selector));
      }

      get controllerSelector() {
        return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier);
      }

    }

    class ScopeObserver {
      constructor(element, schema, delegate) {
        this.element = element;
        this.schema = schema;
        this.delegate = delegate;
        this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this);
        this.scopesByIdentifierByElement = new WeakMap();
        this.scopeReferenceCounts = new WeakMap();
      }

      start() {
        this.valueListObserver.start();
      }

      stop() {
        this.valueListObserver.stop();
      }

      get controllerAttribute() {
        return this.schema.controllerAttribute;
      }

      parseValueForToken(token) {
        const {
          element,
          content: identifier
        } = token;
        const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element);
        let scope = scopesByIdentifier.get(identifier);

        if (!scope) {
          scope = this.delegate.createScopeForElementAndIdentifier(element, identifier);
          scopesByIdentifier.set(identifier, scope);
        }

        return scope;
      }

      elementMatchedValue(element, value) {
        const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1;
        this.scopeReferenceCounts.set(value, referenceCount);

        if (referenceCount == 1) {
          this.delegate.scopeConnected(value);
        }
      }

      elementUnmatchedValue(element, value) {
        const referenceCount = this.scopeReferenceCounts.get(value);

        if (referenceCount) {
          this.scopeReferenceCounts.set(value, referenceCount - 1);

          if (referenceCount == 1) {
            this.delegate.scopeDisconnected(value);
          }
        }
      }

      fetchScopesByIdentifierForElement(element) {
        let scopesByIdentifier = this.scopesByIdentifierByElement.get(element);

        if (!scopesByIdentifier) {
          scopesByIdentifier = new Map();
          this.scopesByIdentifierByElement.set(element, scopesByIdentifier);
        }

        return scopesByIdentifier;
      }

    }

    class Router {
      constructor(application) {
        this.application = application;
        this.scopeObserver = new ScopeObserver(this.element, this.schema, this);
        this.scopesByIdentifier = new Multimap();
        this.modulesByIdentifier = new Map();
      }

      get element() {
        return this.application.element;
      }

      get schema() {
        return this.application.schema;
      }

      get logger() {
        return this.application.logger;
      }

      get controllerAttribute() {
        return this.schema.controllerAttribute;
      }

      get modules() {
        return Array.from(this.modulesByIdentifier.values());
      }

      get contexts() {
        return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), []);
      }

      start() {
        this.scopeObserver.start();
      }

      stop() {
        this.scopeObserver.stop();
      }

      loadDefinition(definition) {
        this.unloadIdentifier(definition.identifier);
        const module = new Module(this.application, definition);
        this.connectModule(module);
      }

      unloadIdentifier(identifier) {
        const module = this.modulesByIdentifier.get(identifier);

        if (module) {
          this.disconnectModule(module);
        }
      }

      getContextForElementAndIdentifier(element, identifier) {
        const module = this.modulesByIdentifier.get(identifier);

        if (module) {
          return module.contexts.find(context => context.element == element);
        }
      }

      handleError(error, message, detail) {
        this.application.handleError(error, message, detail);
      }

      createScopeForElementAndIdentifier(element, identifier) {
        return new Scope(this.schema, element, identifier, this.logger);
      }

      scopeConnected(scope) {
        this.scopesByIdentifier.add(scope.identifier, scope);
        const module = this.modulesByIdentifier.get(scope.identifier);

        if (module) {
          module.connectContextForScope(scope);
        }
      }

      scopeDisconnected(scope) {
        this.scopesByIdentifier.delete(scope.identifier, scope);
        const module = this.modulesByIdentifier.get(scope.identifier);

        if (module) {
          module.disconnectContextForScope(scope);
        }
      }

      connectModule(module) {
        this.modulesByIdentifier.set(module.identifier, module);
        const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
        scopes.forEach(scope => module.connectContextForScope(scope));
      }

      disconnectModule(module) {
        this.modulesByIdentifier.delete(module.identifier);
        const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
        scopes.forEach(scope => module.disconnectContextForScope(scope));
      }

    }

    const defaultSchema = {
      controllerAttribute: "data-controller",
      actionAttribute: "data-action",
      targetAttribute: "data-target",
      targetAttributeForScope: identifier => `data-${identifier}-target`
    };

    class Application {
      constructor(element = document.documentElement, schema = defaultSchema) {
        this.logger = console;
        this.debug = false;

        this.logDebugActivity = (identifier, functionName, detail = {}) => {
          if (this.debug) {
            this.logFormattedMessage(identifier, functionName, detail);
          }
        };

        this.element = element;
        this.schema = schema;
        this.dispatcher = new Dispatcher(this);
        this.router = new Router(this);
      }

      static start(element, schema) {
        const application = new Application(element, schema);
        application.start();
        return application;
      }

      async start() {
        await domReady();
        this.logDebugActivity("application", "starting");
        this.dispatcher.start();
        this.router.start();
        this.logDebugActivity("application", "start");
      }

      stop() {
        this.logDebugActivity("application", "stopping");
        this.dispatcher.stop();
        this.router.stop();
        this.logDebugActivity("application", "stop");
      }

      register(identifier, controllerConstructor) {
        if (controllerConstructor.shouldLoad) {
          this.load({
            identifier,
            controllerConstructor
          });
        }
      }

      load(head, ...rest) {
        const definitions = Array.isArray(head) ? head : [head, ...rest];
        definitions.forEach(definition => this.router.loadDefinition(definition));
      }

      unload(head, ...rest) {
        const identifiers = Array.isArray(head) ? head : [head, ...rest];
        identifiers.forEach(identifier => this.router.unloadIdentifier(identifier));
      }

      get controllers() {
        return this.router.contexts.map(context => context.controller);
      }

      getControllerForElementAndIdentifier(element, identifier) {
        const context = this.router.getContextForElementAndIdentifier(element, identifier);
        return context ? context.controller : null;
      }

      handleError(error, message, detail) {
        var _a;

        this.logger.error(`%s\n\n%o\n\n%o`, message, error, detail);
        (_a = window.onerror) === null || _a === void 0 ? void 0 : _a.call(window, message, "", 0, 0, error);
      }

      logFormattedMessage(identifier, functionName, detail = {}) {
        detail = Object.assign({
          application: this
        }, detail);
        this.logger.groupCollapsed(`${identifier} #${functionName}`);
        this.logger.log("details:", Object.assign({}, detail));
        this.logger.groupEnd();
      }

    }

    function domReady() {
      return new Promise(resolve => {
        if (document.readyState == "loading") {
          document.addEventListener("DOMContentLoaded", () => resolve());
        } else {
          resolve();
        }
      });
    }

    function ClassPropertiesBlessing(constructor) {
      const classes = readInheritableStaticArrayValues(constructor, "classes");
      return classes.reduce((properties, classDefinition) => {
        return Object.assign(properties, propertiesForClassDefinition(classDefinition));
      }, {});
    }

    function propertiesForClassDefinition(key) {
      return {
        [`${key}Class`]: {
          get() {
            const {
              classes
            } = this;

            if (classes.has(key)) {
              return classes.get(key);
            } else {
              const attribute = classes.getAttributeName(key);
              throw new Error(`Missing attribute "${attribute}"`);
            }
          }

        },
        [`${key}Classes`]: {
          get() {
            return this.classes.getAll(key);
          }

        },
        [`has${capitalize(key)}Class`]: {
          get() {
            return this.classes.has(key);
          }

        }
      };
    }

    function TargetPropertiesBlessing(constructor) {
      const targets = readInheritableStaticArrayValues(constructor, "targets");
      return targets.reduce((properties, targetDefinition) => {
        return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
      }, {});
    }

    function propertiesForTargetDefinition(name) {
      return {
        [`${name}Target`]: {
          get() {
            const target = this.targets.find(name);

            if (target) {
              return target;
            } else {
              throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
            }
          }

        },
        [`${name}Targets`]: {
          get() {
            return this.targets.findAll(name);
          }

        },
        [`has${capitalize(name)}Target`]: {
          get() {
            return this.targets.has(name);
          }

        }
      };
    }

    function ValuePropertiesBlessing(constructor) {
      const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
      const propertyDescriptorMap = {
        valueDescriptorMap: {
          get() {
            return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
              const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair);
              const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
              return Object.assign(result, {
                [attributeName]: valueDescriptor
              });
            }, {});
          }

        }
      };
      return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
        return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
      }, propertyDescriptorMap);
    }

    function propertiesForValueDefinitionPair(valueDefinitionPair) {
      const definition = parseValueDefinitionPair(valueDefinitionPair);
      const {
        key,
        name,
        reader: read,
        writer: write
      } = definition;
      return {
        [name]: {
          get() {
            const value = this.data.get(key);

            if (value !== null) {
              return read(value);
            } else {
              return definition.defaultValue;
            }
          },

          set(value) {
            if (value === undefined) {
              this.data.delete(key);
            } else {
              this.data.set(key, write(value));
            }
          }

        },
        [`has${capitalize(name)}`]: {
          get() {
            return this.data.has(key) || definition.hasCustomDefaultValue;
          }

        }
      };
    }

    function parseValueDefinitionPair([token, typeDefinition]) {
      return valueDescriptorForTokenAndTypeDefinition(token, typeDefinition);
    }

    function parseValueTypeConstant(constant) {
      switch (constant) {
        case Array:
          return "array";

        case Boolean:
          return "boolean";

        case Number:
          return "number";

        case Object:
          return "object";

        case String:
          return "string";
      }
    }

    function parseValueTypeDefault(defaultValue) {
      switch (typeof defaultValue) {
        case "boolean":
          return "boolean";

        case "number":
          return "number";

        case "string":
          return "string";
      }

      if (Array.isArray(defaultValue)) return "array";
      if (Object.prototype.toString.call(defaultValue) === "[object Object]") return "object";
    }

    function parseValueTypeObject(typeObject) {
      const typeFromObject = parseValueTypeConstant(typeObject.type);

      if (typeFromObject) {
        const defaultValueType = parseValueTypeDefault(typeObject.default);

        if (typeFromObject !== defaultValueType) {
          throw new Error(`Type "${typeFromObject}" must match the type of the default value. Given default value: "${typeObject.default}" as "${defaultValueType}"`);
        }

        return typeFromObject;
      }
    }

    function parseValueTypeDefinition(typeDefinition) {
      const typeFromObject = parseValueTypeObject(typeDefinition);
      const typeFromDefaultValue = parseValueTypeDefault(typeDefinition);
      const typeFromConstant = parseValueTypeConstant(typeDefinition);
      const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
      if (type) return type;
      throw new Error(`Unknown value type "${typeDefinition}"`);
    }

    function defaultValueForDefinition(typeDefinition) {
      const constant = parseValueTypeConstant(typeDefinition);
      if (constant) return defaultValuesByType[constant];
      const defaultValue = typeDefinition.default;
      if (defaultValue !== undefined) return defaultValue;
      return typeDefinition;
    }

    function valueDescriptorForTokenAndTypeDefinition(token, typeDefinition) {
      const key = `${dasherize(token)}-value`;
      const type = parseValueTypeDefinition(typeDefinition);
      return {
        type,
        key,
        name: camelize(key),

        get defaultValue() {
          return defaultValueForDefinition(typeDefinition);
        },

        get hasCustomDefaultValue() {
          return parseValueTypeDefault(typeDefinition) !== undefined;
        },

        reader: readers[type],
        writer: writers[type] || writers.default
      };
    }

    const defaultValuesByType = {
      get array() {
        return [];
      },

      boolean: false,
      number: 0,

      get object() {
        return {};
      },

      string: ""
    };
    const readers = {
      array(value) {
        const array = JSON.parse(value);

        if (!Array.isArray(array)) {
          throw new TypeError("Expected array");
        }

        return array;
      },

      boolean(value) {
        return !(value == "0" || value == "false");
      },

      number(value) {
        return Number(value);
      },

      object(value) {
        const object = JSON.parse(value);

        if (object === null || typeof object != "object" || Array.isArray(object)) {
          throw new TypeError("Expected object");
        }

        return object;
      },

      string(value) {
        return value;
      }

    };
    const writers = {
      default: writeString,
      array: writeJSON,
      object: writeJSON
    };

    function writeJSON(value) {
      return JSON.stringify(value);
    }

    function writeString(value) {
      return `${value}`;
    }

    class Controller {
      constructor(context) {
        this.context = context;
      }

      static get shouldLoad() {
        return true;
      }

      get application() {
        return this.context.application;
      }

      get scope() {
        return this.context.scope;
      }

      get element() {
        return this.scope.element;
      }

      get identifier() {
        return this.scope.identifier;
      }

      get targets() {
        return this.scope.targets;
      }

      get classes() {
        return this.scope.classes;
      }

      get data() {
        return this.scope.data;
      }

      initialize() {}

      connect() {}

      disconnect() {}

      dispatch(eventName, {
        target = this.element,
        detail = {},
        prefix = this.identifier,
        bubbles = true,
        cancelable = true
      } = {}) {
        const type = prefix ? `${prefix}:${eventName}` : eventName;
        const event = new CustomEvent(type, {
          detail,
          bubbles,
          cancelable
        });
        target.dispatchEvent(event);
        return event;
      }

    }

    Controller.blessings = [ClassPropertiesBlessing, TargetPropertiesBlessing, ValuePropertiesBlessing];
    Controller.targets = [];
    Controller.values = {};

    const version$f = "logger/5.6.0";

    let _permanentCensorErrors = false;
    let _censorErrors = false;
    const LogLevels = {
      debug: 1,
      "default": 2,
      info: 2,
      warning: 3,
      error: 4,
      off: 5
    };
    let _logLevel = LogLevels["default"];
    let _globalLogger = null;

    function _checkNormalize() {
      try {
        const missing = []; // Make sure all forms of normalization are supported

        ["NFD", "NFC", "NFKD", "NFKC"].forEach(form => {
          try {
            if ("test".normalize(form) !== "test") {
              throw new Error("bad normalize");
            }

            ;
          } catch (error) {
            missing.push(form);
          }
        });

        if (missing.length) {
          throw new Error("missing " + missing.join(", "));
        }

        if (String.fromCharCode(0xe9).normalize("NFD") !== String.fromCharCode(0x65, 0x0301)) {
          throw new Error("broken implementation");
        }
      } catch (error) {
        return error.message;
      }

      return null;
    }

    const _normalizeError = _checkNormalize();

    var LogLevel;

    (function (LogLevel) {
      LogLevel["DEBUG"] = "DEBUG";
      LogLevel["INFO"] = "INFO";
      LogLevel["WARNING"] = "WARNING";
      LogLevel["ERROR"] = "ERROR";
      LogLevel["OFF"] = "OFF";
    })(LogLevel || (LogLevel = {}));

    var ErrorCode;

    (function (ErrorCode) {
      ///////////////////
      // Generic Errors
      // Unknown Error
      ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR"; // Not Implemented

      ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED"; // Unsupported Operation
      //   - operation

      ErrorCode["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION"; // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
      //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)

      ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR"; // Some sort of bad response from the server

      ErrorCode["SERVER_ERROR"] = "SERVER_ERROR"; // Timeout

      ErrorCode["TIMEOUT"] = "TIMEOUT"; ///////////////////
      // Operational  Errors
      // Buffer Overrun

      ErrorCode["BUFFER_OVERRUN"] = "BUFFER_OVERRUN"; // Numeric Fault
      //   - operation: the operation being executed
      //   - fault: the reason this faulted

      ErrorCode["NUMERIC_FAULT"] = "NUMERIC_FAULT"; ///////////////////
      // Argument Errors
      // Missing new operator to an object
      //  - name: The name of the class

      ErrorCode["MISSING_NEW"] = "MISSING_NEW"; // Invalid argument (e.g. value is incompatible with type) to a function:
      //   - argument: The argument name that was invalid
      //   - value: The value of the argument

      ErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT"; // Missing argument to a function:
      //   - count: The number of arguments received
      //   - expectedCount: The number of arguments expected

      ErrorCode["MISSING_ARGUMENT"] = "MISSING_ARGUMENT"; // Too many arguments
      //   - count: The number of arguments received
      //   - expectedCount: The number of arguments expected

      ErrorCode["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT"; ///////////////////
      // Blockchain Errors
      // Call exception
      //  - transaction: the transaction
      //  - address?: the contract address
      //  - args?: The arguments passed into the function
      //  - method?: The Solidity method signature
      //  - errorSignature?: The EIP848 error signature
      //  - errorArgs?: The EIP848 error parameters
      //  - reason: The reason (only for EIP848 "Error(string)")

      ErrorCode["CALL_EXCEPTION"] = "CALL_EXCEPTION"; // Insufficient funds (< value + gasLimit * gasPrice)
      //   - transaction: the transaction attempted

      ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS"; // Nonce has already been used
      //   - transaction: the transaction attempted

      ErrorCode["NONCE_EXPIRED"] = "NONCE_EXPIRED"; // The replacement fee for the transaction is too low
      //   - transaction: the transaction attempted

      ErrorCode["REPLACEMENT_UNDERPRICED"] = "REPLACEMENT_UNDERPRICED"; // The gas limit could not be estimated
      //   - transaction: the transaction passed to estimateGas

      ErrorCode["UNPREDICTABLE_GAS_LIMIT"] = "UNPREDICTABLE_GAS_LIMIT"; // The transaction was replaced by one with a higher gas price
      //   - reason: "cancelled", "replaced" or "repriced"
      //   - cancelled: true if reason == "cancelled" or reason == "replaced")
      //   - hash: original transaction hash
      //   - replacement: the full TransactionsResponse for the replacement
      //   - receipt: the receipt of the replacement

      ErrorCode["TRANSACTION_REPLACED"] = "TRANSACTION_REPLACED";
    })(ErrorCode || (ErrorCode = {}));
    const HEX = "0123456789abcdef";
    class Logger {
      constructor(version) {
        Object.defineProperty(this, "version", {
          enumerable: true,
          value: version,
          writable: false
        });
      }

      _log(logLevel, args) {
        const level = logLevel.toLowerCase();

        if (LogLevels[level] == null) {
          this.throwArgumentError("invalid log level name", "logLevel", logLevel);
        }

        if (_logLevel > LogLevels[level]) {
          return;
        }

        console.log.apply(console, args);
      }

      debug(...args) {
        this._log(Logger.levels.DEBUG, args);
      }

      info(...args) {
        this._log(Logger.levels.INFO, args);
      }

      warn(...args) {
        this._log(Logger.levels.WARNING, args);
      }

      makeError(message, code, params) {
        // Errors are being censored
        if (_censorErrors) {
          return this.makeError("censored error", code, {});
        }

        if (!code) {
          code = Logger.errors.UNKNOWN_ERROR;
        }

        if (!params) {
          params = {};
        }

        const messageDetails = [];
        Object.keys(params).forEach(key => {
          const value = params[key];

          try {
            if (value instanceof Uint8Array) {
              let hex = "";

              for (let i = 0; i < value.length; i++) {
                hex += HEX[value[i] >> 4];
                hex += HEX[value[i] & 0x0f];
              }

              messageDetails.push(key + "=Uint8Array(0x" + hex + ")");
            } else {
              messageDetails.push(key + "=" + JSON.stringify(value));
            }
          } catch (error) {
            messageDetails.push(key + "=" + JSON.stringify(params[key].toString()));
          }
        });
        messageDetails.push(`code=${code}`);
        messageDetails.push(`version=${this.version}`);
        const reason = message;
        let url = "";

        switch (code) {
          case ErrorCode.NUMERIC_FAULT:
            {
              url = "NUMERIC_FAULT";
              const fault = message;

              switch (fault) {
                case "overflow":
                case "underflow":
                case "division-by-zero":
                  url += "-" + fault;
                  break;

                case "negative-power":
                case "negative-width":
                  url += "-unsupported";
                  break;

                case "unbound-bitwise-result":
                  url += "-unbound-result";
                  break;
              }

              break;
            }

          case ErrorCode.CALL_EXCEPTION:
          case ErrorCode.INSUFFICIENT_FUNDS:
          case ErrorCode.MISSING_NEW:
          case ErrorCode.NONCE_EXPIRED:
          case ErrorCode.REPLACEMENT_UNDERPRICED:
          case ErrorCode.TRANSACTION_REPLACED:
          case ErrorCode.UNPREDICTABLE_GAS_LIMIT:
            url = code;
            break;
        }

        if (url) {
          message += " [ See: https:/\/links.ethers.org/v5-errors-" + url + " ]";
        }

        if (messageDetails.length) {
          message += " (" + messageDetails.join(", ") + ")";
        } // @TODO: Any??


        const error = new Error(message);
        error.reason = reason;
        error.code = code;
        Object.keys(params).forEach(function (key) {
          error[key] = params[key];
        });
        return error;
      }

      throwError(message, code, params) {
        throw this.makeError(message, code, params);
      }

      throwArgumentError(message, name, value) {
        return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
          argument: name,
          value: value
        });
      }

      assert(condition, message, code, params) {
        if (!!condition) {
          return;
        }

        this.throwError(message, code, params);
      }

      assertArgument(condition, message, name, value) {
        if (!!condition) {
          return;
        }

        this.throwArgumentError(message, name, value);
      }

      checkNormalize(message) {

        if (_normalizeError) {
          this.throwError("platform missing String.prototype.normalize", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "String.prototype.normalize",
            form: _normalizeError
          });
        }
      }

      checkSafeUint53(value, message) {
        if (typeof value !== "number") {
          return;
        }

        if (message == null) {
          message = "value not safe";
        }

        if (value < 0 || value >= 0x1fffffffffffff) {
          this.throwError(message, Logger.errors.NUMERIC_FAULT, {
            operation: "checkSafeInteger",
            fault: "out-of-safe-range",
            value: value
          });
        }

        if (value % 1) {
          this.throwError(message, Logger.errors.NUMERIC_FAULT, {
            operation: "checkSafeInteger",
            fault: "non-integer",
            value: value
          });
        }
      }

      checkArgumentCount(count, expectedCount, message) {
        if (message) {
          message = ": " + message;
        } else {
          message = "";
        }

        if (count < expectedCount) {
          this.throwError("missing argument" + message, Logger.errors.MISSING_ARGUMENT, {
            count: count,
            expectedCount: expectedCount
          });
        }

        if (count > expectedCount) {
          this.throwError("too many arguments" + message, Logger.errors.UNEXPECTED_ARGUMENT, {
            count: count,
            expectedCount: expectedCount
          });
        }
      }

      checkNew(target, kind) {
        if (target === Object || target == null) {
          this.throwError("missing new", Logger.errors.MISSING_NEW, {
            name: kind.name
          });
        }
      }

      checkAbstract(target, kind) {
        if (target === kind) {
          this.throwError("cannot instantiate abstract class " + JSON.stringify(kind.name) + " directly; use a sub-class", Logger.errors.UNSUPPORTED_OPERATION, {
            name: target.name,
            operation: "new"
          });
        } else if (target === Object || target == null) {
          this.throwError("missing new", Logger.errors.MISSING_NEW, {
            name: kind.name
          });
        }
      }

      static globalLogger() {
        if (!_globalLogger) {
          _globalLogger = new Logger(version$f);
        }

        return _globalLogger;
      }

      static setCensorship(censorship, permanent) {
        if (!censorship && permanent) {
          this.globalLogger().throwError("cannot permanently disable censorship", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "setCensorship"
          });
        }

        if (_permanentCensorErrors) {
          if (!censorship) {
            return;
          }

          this.globalLogger().throwError("error censorship permanent", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "setCensorship"
          });
        }

        _censorErrors = !!censorship;
        _permanentCensorErrors = !!permanent;
      }

      static setLogLevel(logLevel) {
        const level = LogLevels[logLevel.toLowerCase()];

        if (level == null) {
          Logger.globalLogger().warn("invalid log level - " + logLevel);
          return;
        }

        _logLevel = level;
      }

      static from(version) {
        return new Logger(version);
      }

    }
    Logger.errors = ErrorCode;
    Logger.levels = LogLevel;

    const version$e = "bytes/5.6.1";

    const logger$h = new Logger(version$e); ///////////////////////////////

    function isHexable(value) {
      return !!value.toHexString;
    }

    function addSlice(array) {
      if (array.slice) {
        return array;
      }

      array.slice = function () {
        const args = Array.prototype.slice.call(arguments);
        return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
      };

      return array;
    }

    function isBytesLike(value) {
      return isHexString(value) && !(value.length % 2) || isBytes(value);
    }

    function isInteger(value) {
      return typeof value === "number" && value == value && value % 1 === 0;
    }

    function isBytes(value) {
      if (value == null) {
        return false;
      }

      if (value.constructor === Uint8Array) {
        return true;
      }

      if (typeof value === "string") {
        return false;
      }

      if (!isInteger(value.length) || value.length < 0) {
        return false;
      }

      for (let i = 0; i < value.length; i++) {
        const v = value[i];

        if (!isInteger(v) || v < 0 || v >= 256) {
          return false;
        }
      }

      return true;
    }
    function arrayify(value, options) {
      if (!options) {
        options = {};
      }

      if (typeof value === "number") {
        logger$h.checkSafeUint53(value, "invalid arrayify value");
        const result = [];

        while (value) {
          result.unshift(value & 0xff);
          value = parseInt(String(value / 256));
        }

        if (result.length === 0) {
          result.push(0);
        }

        return addSlice(new Uint8Array(result));
      }

      if (options.allowMissingPrefix && typeof value === "string" && value.substring(0, 2) !== "0x") {
        value = "0x" + value;
      }

      if (isHexable(value)) {
        value = value.toHexString();
      }

      if (isHexString(value)) {
        let hex = value.substring(2);

        if (hex.length % 2) {
          if (options.hexPad === "left") {
            hex = "0" + hex;
          } else if (options.hexPad === "right") {
            hex += "0";
          } else {
            logger$h.throwArgumentError("hex data is odd-length", "value", value);
          }
        }

        const result = [];

        for (let i = 0; i < hex.length; i += 2) {
          result.push(parseInt(hex.substring(i, i + 2), 16));
        }

        return addSlice(new Uint8Array(result));
      }

      if (isBytes(value)) {
        return addSlice(new Uint8Array(value));
      }

      return logger$h.throwArgumentError("invalid arrayify value", "value", value);
    }
    function concat(items) {
      const objects = items.map(item => arrayify(item));
      const length = objects.reduce((accum, item) => accum + item.length, 0);
      const result = new Uint8Array(length);
      objects.reduce((offset, object) => {
        result.set(object, offset);
        return offset + object.length;
      }, 0);
      return addSlice(result);
    }
    function stripZeros(value) {
      let result = arrayify(value);

      if (result.length === 0) {
        return result;
      } // Find the first non-zero entry


      let start = 0;

      while (start < result.length && result[start] === 0) {
        start++;
      } // If we started with zeros, strip them


      if (start) {
        result = result.slice(start);
      }

      return result;
    }
    function zeroPad(value, length) {
      value = arrayify(value);

      if (value.length > length) {
        logger$h.throwArgumentError("value out of range", "value", arguments[0]);
      }

      const result = new Uint8Array(length);
      result.set(value, length - value.length);
      return addSlice(result);
    }
    function isHexString(value, length) {
      if (typeof value !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
        return false;
      }

      if (length && value.length !== 2 + 2 * length) {
        return false;
      }

      return true;
    }
    const HexCharacters = "0123456789abcdef";
    function hexlify(value, options) {
      if (!options) {
        options = {};
      }

      if (typeof value === "number") {
        logger$h.checkSafeUint53(value, "invalid hexlify value");
        let hex = "";

        while (value) {
          hex = HexCharacters[value & 0xf] + hex;
          value = Math.floor(value / 16);
        }

        if (hex.length) {
          if (hex.length % 2) {
            hex = "0" + hex;
          }

          return "0x" + hex;
        }

        return "0x00";
      }

      if (typeof value === "bigint") {
        value = value.toString(16);

        if (value.length % 2) {
          return "0x0" + value;
        }

        return "0x" + value;
      }

      if (options.allowMissingPrefix && typeof value === "string" && value.substring(0, 2) !== "0x") {
        value = "0x" + value;
      }

      if (isHexable(value)) {
        return value.toHexString();
      }

      if (isHexString(value)) {
        if (value.length % 2) {
          if (options.hexPad === "left") {
            value = "0x0" + value.substring(2);
          } else if (options.hexPad === "right") {
            value += "0";
          } else {
            logger$h.throwArgumentError("hex data is odd-length", "value", value);
          }
        }

        return value.toLowerCase();
      }

      if (isBytes(value)) {
        let result = "0x";

        for (let i = 0; i < value.length; i++) {
          let v = value[i];
          result += HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f];
        }

        return result;
      }

      return logger$h.throwArgumentError("invalid hexlify value", "value", value);
    }
    /*
    function unoddify(value: BytesLike | Hexable | number): BytesLike | Hexable | number {
        if (typeof(value) === "string" && value.length % 2 && value.substring(0, 2) === "0x") {
            return "0x0" + value.substring(2);
        }
        return value;
    }
    */

    function hexDataLength(data) {
      if (typeof data !== "string") {
        data = hexlify(data);
      } else if (!isHexString(data) || data.length % 2) {
        return null;
      }

      return (data.length - 2) / 2;
    }
    function hexDataSlice(data, offset, endOffset) {
      if (typeof data !== "string") {
        data = hexlify(data);
      } else if (!isHexString(data) || data.length % 2) {
        logger$h.throwArgumentError("invalid hexData", "value", data);
      }

      offset = 2 + 2 * offset;

      if (endOffset != null) {
        return "0x" + data.substring(offset, 2 + 2 * endOffset);
      }

      return "0x" + data.substring(offset);
    }
    function hexConcat(items) {
      let result = "0x";
      items.forEach(item => {
        result += hexlify(item).substring(2);
      });
      return result;
    }
    function hexValue(value) {
      const trimmed = hexStripZeros(hexlify(value, {
        hexPad: "left"
      }));

      if (trimmed === "0x") {
        return "0x0";
      }

      return trimmed;
    }
    function hexStripZeros(value) {
      if (typeof value !== "string") {
        value = hexlify(value);
      }

      if (!isHexString(value)) {
        logger$h.throwArgumentError("invalid hex string", "value", value);
      }

      value = value.substring(2);
      let offset = 0;

      while (offset < value.length && value[offset] === "0") {
        offset++;
      }

      return "0x" + value.substring(offset);
    }
    function hexZeroPad(value, length) {
      if (typeof value !== "string") {
        value = hexlify(value);
      } else if (!isHexString(value)) {
        logger$h.throwArgumentError("invalid hex string", "value", value);
      }

      if (value.length > 2 * length + 2) {
        logger$h.throwArgumentError("value out of range", "value", arguments[1]);
      }

      while (value.length < 2 * length + 2) {
        value = "0x0" + value.substring(2);
      }

      return value;
    }
    function splitSignature(signature) {
      const result = {
        r: "0x",
        s: "0x",
        _vs: "0x",
        recoveryParam: 0,
        v: 0,
        yParityAndS: "0x",
        compact: "0x"
      };

      if (isBytesLike(signature)) {
        let bytes = arrayify(signature); // Get the r, s and v

        if (bytes.length === 64) {
          // EIP-2098; pull the v from the top bit of s and clear it
          result.v = 27 + (bytes[32] >> 7);
          bytes[32] &= 0x7f;
          result.r = hexlify(bytes.slice(0, 32));
          result.s = hexlify(bytes.slice(32, 64));
        } else if (bytes.length === 65) {
          result.r = hexlify(bytes.slice(0, 32));
          result.s = hexlify(bytes.slice(32, 64));
          result.v = bytes[64];
        } else {
          logger$h.throwArgumentError("invalid signature string", "signature", signature);
        } // Allow a recid to be used as the v


        if (result.v < 27) {
          if (result.v === 0 || result.v === 1) {
            result.v += 27;
          } else {
            logger$h.throwArgumentError("signature invalid v byte", "signature", signature);
          }
        } // Compute recoveryParam from v


        result.recoveryParam = 1 - result.v % 2; // Compute _vs from recoveryParam and s

        if (result.recoveryParam) {
          bytes[32] |= 0x80;
        }

        result._vs = hexlify(bytes.slice(32, 64));
      } else {
        result.r = signature.r;
        result.s = signature.s;
        result.v = signature.v;
        result.recoveryParam = signature.recoveryParam;
        result._vs = signature._vs; // If the _vs is available, use it to populate missing s, v and recoveryParam
        // and verify non-missing s, v and recoveryParam

        if (result._vs != null) {
          const vs = zeroPad(arrayify(result._vs), 32);
          result._vs = hexlify(vs); // Set or check the recid

          const recoveryParam = vs[0] >= 128 ? 1 : 0;

          if (result.recoveryParam == null) {
            result.recoveryParam = recoveryParam;
          } else if (result.recoveryParam !== recoveryParam) {
            logger$h.throwArgumentError("signature recoveryParam mismatch _vs", "signature", signature);
          } // Set or check the s


          vs[0] &= 0x7f;
          const s = hexlify(vs);

          if (result.s == null) {
            result.s = s;
          } else if (result.s !== s) {
            logger$h.throwArgumentError("signature v mismatch _vs", "signature", signature);
          }
        } // Use recid and v to populate each other


        if (result.recoveryParam == null) {
          if (result.v == null) {
            logger$h.throwArgumentError("signature missing v and recoveryParam", "signature", signature);
          } else if (result.v === 0 || result.v === 1) {
            result.recoveryParam = result.v;
          } else {
            result.recoveryParam = 1 - result.v % 2;
          }
        } else {
          if (result.v == null) {
            result.v = 27 + result.recoveryParam;
          } else {
            const recId = result.v === 0 || result.v === 1 ? result.v : 1 - result.v % 2;

            if (result.recoveryParam !== recId) {
              logger$h.throwArgumentError("signature recoveryParam mismatch v", "signature", signature);
            }
          }
        }

        if (result.r == null || !isHexString(result.r)) {
          logger$h.throwArgumentError("signature missing or invalid r", "signature", signature);
        } else {
          result.r = hexZeroPad(result.r, 32);
        }

        if (result.s == null || !isHexString(result.s)) {
          logger$h.throwArgumentError("signature missing or invalid s", "signature", signature);
        } else {
          result.s = hexZeroPad(result.s, 32);
        }

        const vs = arrayify(result.s);

        if (vs[0] >= 128) {
          logger$h.throwArgumentError("signature s out of range", "signature", signature);
        }

        if (result.recoveryParam) {
          vs[0] |= 0x80;
        }

        const _vs = hexlify(vs);

        if (result._vs) {
          if (!isHexString(result._vs)) {
            logger$h.throwArgumentError("signature invalid _vs", "signature", signature);
          }

          result._vs = hexZeroPad(result._vs, 32);
        } // Set or check the _vs


        if (result._vs == null) {
          result._vs = _vs;
        } else if (result._vs !== _vs) {
          logger$h.throwArgumentError("signature _vs mismatch v and s", "signature", signature);
        }
      }

      result.yParityAndS = result._vs;
      result.compact = result.r + result.yParityAndS.substring(2);
      return result;
    }

    const version$d = "bignumber/5.6.2";

    var BN = BN__default["default"].BN;
    const logger$g = new Logger(version$d);
    const _constructorGuard$1 = {};
    const MAX_SAFE = 0x1fffffffffffff;

    let _warnedToStringRadix = false;
    class BigNumber {
      constructor(constructorGuard, hex) {
        if (constructorGuard !== _constructorGuard$1) {
          logger$g.throwError("cannot call constructor directly; use BigNumber.from", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "new (BigNumber)"
          });
        }

        this._hex = hex;
        this._isBigNumber = true;
        Object.freeze(this);
      }

      fromTwos(value) {
        return toBigNumber(toBN(this).fromTwos(value));
      }

      toTwos(value) {
        return toBigNumber(toBN(this).toTwos(value));
      }

      abs() {
        if (this._hex[0] === "-") {
          return BigNumber.from(this._hex.substring(1));
        }

        return this;
      }

      add(other) {
        return toBigNumber(toBN(this).add(toBN(other)));
      }

      sub(other) {
        return toBigNumber(toBN(this).sub(toBN(other)));
      }

      div(other) {
        const o = BigNumber.from(other);

        if (o.isZero()) {
          throwFault("division-by-zero", "div");
        }

        return toBigNumber(toBN(this).div(toBN(other)));
      }

      mul(other) {
        return toBigNumber(toBN(this).mul(toBN(other)));
      }

      mod(other) {
        const value = toBN(other);

        if (value.isNeg()) {
          throwFault("division-by-zero", "mod");
        }

        return toBigNumber(toBN(this).umod(value));
      }

      pow(other) {
        const value = toBN(other);

        if (value.isNeg()) {
          throwFault("negative-power", "pow");
        }

        return toBigNumber(toBN(this).pow(value));
      }

      and(other) {
        const value = toBN(other);

        if (this.isNegative() || value.isNeg()) {
          throwFault("unbound-bitwise-result", "and");
        }

        return toBigNumber(toBN(this).and(value));
      }

      or(other) {
        const value = toBN(other);

        if (this.isNegative() || value.isNeg()) {
          throwFault("unbound-bitwise-result", "or");
        }

        return toBigNumber(toBN(this).or(value));
      }

      xor(other) {
        const value = toBN(other);

        if (this.isNegative() || value.isNeg()) {
          throwFault("unbound-bitwise-result", "xor");
        }

        return toBigNumber(toBN(this).xor(value));
      }

      mask(value) {
        if (this.isNegative() || value < 0) {
          throwFault("negative-width", "mask");
        }

        return toBigNumber(toBN(this).maskn(value));
      }

      shl(value) {
        if (this.isNegative() || value < 0) {
          throwFault("negative-width", "shl");
        }

        return toBigNumber(toBN(this).shln(value));
      }

      shr(value) {
        if (this.isNegative() || value < 0) {
          throwFault("negative-width", "shr");
        }

        return toBigNumber(toBN(this).shrn(value));
      }

      eq(other) {
        return toBN(this).eq(toBN(other));
      }

      lt(other) {
        return toBN(this).lt(toBN(other));
      }

      lte(other) {
        return toBN(this).lte(toBN(other));
      }

      gt(other) {
        return toBN(this).gt(toBN(other));
      }

      gte(other) {
        return toBN(this).gte(toBN(other));
      }

      isNegative() {
        return this._hex[0] === "-";
      }

      isZero() {
        return toBN(this).isZero();
      }

      toNumber() {
        try {
          return toBN(this).toNumber();
        } catch (error) {
          throwFault("overflow", "toNumber", this.toString());
        }

        return null;
      }

      toBigInt() {
        try {
          return BigInt(this.toString());
        } catch (e) {}

        return logger$g.throwError("this platform does not support BigInt", Logger.errors.UNSUPPORTED_OPERATION, {
          value: this.toString()
        });
      }

      toString() {
        // Lots of people expect this, which we do not support, so check (See: #889)
        if (arguments.length > 0) {
          if (arguments[0] === 10) {
            if (!_warnedToStringRadix) {
              _warnedToStringRadix = true;
              logger$g.warn("BigNumber.toString does not accept any parameters; base-10 is assumed");
            }
          } else if (arguments[0] === 16) {
            logger$g.throwError("BigNumber.toString does not accept any parameters; use bigNumber.toHexString()", Logger.errors.UNEXPECTED_ARGUMENT, {});
          } else {
            logger$g.throwError("BigNumber.toString does not accept parameters", Logger.errors.UNEXPECTED_ARGUMENT, {});
          }
        }

        return toBN(this).toString(10);
      }

      toHexString() {
        return this._hex;
      }

      toJSON(key) {
        return {
          type: "BigNumber",
          hex: this.toHexString()
        };
      }

      static from(value) {
        if (value instanceof BigNumber) {
          return value;
        }

        if (typeof value === "string") {
          if (value.match(/^-?0x[0-9a-f]+$/i)) {
            return new BigNumber(_constructorGuard$1, toHex(value));
          }

          if (value.match(/^-?[0-9]+$/)) {
            return new BigNumber(_constructorGuard$1, toHex(new BN(value)));
          }

          return logger$g.throwArgumentError("invalid BigNumber string", "value", value);
        }

        if (typeof value === "number") {
          if (value % 1) {
            throwFault("underflow", "BigNumber.from", value);
          }

          if (value >= MAX_SAFE || value <= -MAX_SAFE) {
            throwFault("overflow", "BigNumber.from", value);
          }

          return BigNumber.from(String(value));
        }

        const anyValue = value;

        if (typeof anyValue === "bigint") {
          return BigNumber.from(anyValue.toString());
        }

        if (isBytes(anyValue)) {
          return BigNumber.from(hexlify(anyValue));
        }

        if (anyValue) {
          // Hexable interface (takes priority)
          if (anyValue.toHexString) {
            const hex = anyValue.toHexString();

            if (typeof hex === "string") {
              return BigNumber.from(hex);
            }
          } else {
            // For now, handle legacy JSON-ified values (goes away in v6)
            let hex = anyValue._hex; // New-form JSON

            if (hex == null && anyValue.type === "BigNumber") {
              hex = anyValue.hex;
            }

            if (typeof hex === "string") {
              if (isHexString(hex) || hex[0] === "-" && isHexString(hex.substring(1))) {
                return BigNumber.from(hex);
              }
            }
          }
        }

        return logger$g.throwArgumentError("invalid BigNumber value", "value", value);
      }

      static isBigNumber(value) {
        return !!(value && value._isBigNumber);
      }

    } // Normalize the hex string

    function toHex(value) {
      // For BN, call on the hex string
      if (typeof value !== "string") {
        return toHex(value.toString(16));
      } // If negative, prepend the negative sign to the normalized positive value


      if (value[0] === "-") {
        // Strip off the negative sign
        value = value.substring(1); // Cannot have multiple negative signs (e.g. "--0x04")

        if (value[0] === "-") {
          logger$g.throwArgumentError("invalid hex", "value", value);
        } // Call toHex on the positive component


        value = toHex(value); // Do not allow "-0x00"

        if (value === "0x00") {
          return value;
        } // Negate the value


        return "-" + value;
      } // Add a "0x" prefix if missing


      if (value.substring(0, 2) !== "0x") {
        value = "0x" + value;
      } // Normalize zero


      if (value === "0x") {
        return "0x00";
      } // Make the string even length


      if (value.length % 2) {
        value = "0x0" + value.substring(2);
      } // Trim to smallest even-length string


      while (value.length > 4 && value.substring(0, 4) === "0x00") {
        value = "0x" + value.substring(4);
      }

      return value;
    }

    function toBigNumber(value) {
      return BigNumber.from(toHex(value));
    }

    function toBN(value) {
      const hex = BigNumber.from(value).toHexString();

      if (hex[0] === "-") {
        return new BN("-" + hex.substring(3), 16);
      }

      return new BN(hex.substring(2), 16);
    }

    function throwFault(fault, operation, value) {
      const params = {
        fault: fault,
        operation: operation
      };

      if (value != null) {
        params.value = value;
      }

      return logger$g.throwError(fault, Logger.errors.NUMERIC_FAULT, params);
    } // value should have no prefix


    function _base36To16(value) {
      return new BN(value, 36).toString(16);
    } // value should have no prefix

    const version$c = "properties/5.6.0";

    var __awaiter$7 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    const logger$f = new Logger(version$c);
    function defineReadOnly(object, name, value) {
      Object.defineProperty(object, name, {
        enumerable: true,
        value: value,
        writable: false
      });
    } // Crawl up the constructor chain to find a static method

    function getStatic(ctor, key) {
      for (let i = 0; i < 32; i++) {
        if (ctor[key]) {
          return ctor[key];
        }

        if (!ctor.prototype || typeof ctor.prototype !== "object") {
          break;
        }

        ctor = Object.getPrototypeOf(ctor.prototype).constructor;
      }

      return null;
    }
    function resolveProperties(object) {
      return __awaiter$7(this, void 0, void 0, function* () {
        const promises = Object.keys(object).map(key => {
          const value = object[key];
          return Promise.resolve(value).then(v => ({
            key: key,
            value: v
          }));
        });
        const results = yield Promise.all(promises);
        return results.reduce((accum, result) => {
          accum[result.key] = result.value;
          return accum;
        }, {});
      });
    }
    function checkProperties(object, properties) {
      if (!object || typeof object !== "object") {
        logger$f.throwArgumentError("invalid object", "object", object);
      }

      Object.keys(object).forEach(key => {
        if (!properties[key]) {
          logger$f.throwArgumentError("invalid object key - " + key, "transaction:" + key, object);
        }
      });
    }
    function shallowCopy(object) {
      const result = {};

      for (const key in object) {
        result[key] = object[key];
      }

      return result;
    }
    const opaque = {
      bigint: true,
      boolean: true,
      "function": true,
      number: true,
      string: true
    };

    function _isFrozen(object) {
      // Opaque objects are not mutable, so safe to copy by assignment
      if (object === undefined || object === null || opaque[typeof object]) {
        return true;
      }

      if (Array.isArray(object) || typeof object === "object") {
        if (!Object.isFrozen(object)) {
          return false;
        }

        const keys = Object.keys(object);

        for (let i = 0; i < keys.length; i++) {
          let value = null;

          try {
            value = object[keys[i]];
          } catch (error) {
            // If accessing a value triggers an error, it is a getter
            // designed to do so (e.g. Result) and is therefore "frozen"
            continue;
          }

          if (!_isFrozen(value)) {
            return false;
          }
        }

        return true;
      }

      return logger$f.throwArgumentError(`Cannot deepCopy ${typeof object}`, "object", object);
    } // Returns a new copy of object, such that no properties may be replaced.
    // New properties may be added only to objects.


    function _deepCopy(object) {
      if (_isFrozen(object)) {
        return object;
      } // Arrays are mutable, so we need to create a copy


      if (Array.isArray(object)) {
        return Object.freeze(object.map(item => deepCopy(item)));
      }

      if (typeof object === "object") {
        const result = {};

        for (const key in object) {
          const value = object[key];

          if (value === undefined) {
            continue;
          }

          defineReadOnly(result, key, deepCopy(value));
        }

        return result;
      }

      return logger$f.throwArgumentError(`Cannot deepCopy ${typeof object}`, "object", object);
    }

    function deepCopy(object) {
      return _deepCopy(object);
    }
    class Description {
      constructor(info) {
        for (const key in info) {
          this[key] = deepCopy(info[key]);
        }
      }

    }

    function keccak256(data) {
      return '0x' + sha3__default["default"].keccak_256(arrayify(data));
    }

    const version$b = "rlp/5.6.1";

    const logger$e = new Logger(version$b);

    function arrayifyInteger(value) {
      const result = [];

      while (value) {
        result.unshift(value & 0xff);
        value >>= 8;
      }

      return result;
    }

    function unarrayifyInteger(data, offset, length) {
      let result = 0;

      for (let i = 0; i < length; i++) {
        result = result * 256 + data[offset + i];
      }

      return result;
    }

    function _encode(object) {
      if (Array.isArray(object)) {
        let payload = [];
        object.forEach(function (child) {
          payload = payload.concat(_encode(child));
        });

        if (payload.length <= 55) {
          payload.unshift(0xc0 + payload.length);
          return payload;
        }

        const length = arrayifyInteger(payload.length);
        length.unshift(0xf7 + length.length);
        return length.concat(payload);
      }

      if (!isBytesLike(object)) {
        logger$e.throwArgumentError("RLP object must be BytesLike", "object", object);
      }

      const data = Array.prototype.slice.call(arrayify(object));

      if (data.length === 1 && data[0] <= 0x7f) {
        return data;
      } else if (data.length <= 55) {
        data.unshift(0x80 + data.length);
        return data;
      }

      const length = arrayifyInteger(data.length);
      length.unshift(0xb7 + length.length);
      return length.concat(data);
    }

    function encode$1(object) {
      return hexlify(_encode(object));
    }

    function _decodeChildren(data, offset, childOffset, length) {
      const result = [];

      while (childOffset < offset + 1 + length) {
        const decoded = _decode(data, childOffset);

        result.push(decoded.result);
        childOffset += decoded.consumed;

        if (childOffset > offset + 1 + length) {
          logger$e.throwError("child data too short", Logger.errors.BUFFER_OVERRUN, {});
        }
      }

      return {
        consumed: 1 + length,
        result: result
      };
    } // returns { consumed: number, result: Object }


    function _decode(data, offset) {
      if (data.length === 0) {
        logger$e.throwError("data too short", Logger.errors.BUFFER_OVERRUN, {});
      } // Array with extra length prefix


      if (data[offset] >= 0xf8) {
        const lengthLength = data[offset] - 0xf7;

        if (offset + 1 + lengthLength > data.length) {
          logger$e.throwError("data short segment too short", Logger.errors.BUFFER_OVERRUN, {});
        }

        const length = unarrayifyInteger(data, offset + 1, lengthLength);

        if (offset + 1 + lengthLength + length > data.length) {
          logger$e.throwError("data long segment too short", Logger.errors.BUFFER_OVERRUN, {});
        }

        return _decodeChildren(data, offset, offset + 1 + lengthLength, lengthLength + length);
      } else if (data[offset] >= 0xc0) {
        const length = data[offset] - 0xc0;

        if (offset + 1 + length > data.length) {
          logger$e.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
        }

        return _decodeChildren(data, offset, offset + 1, length);
      } else if (data[offset] >= 0xb8) {
        const lengthLength = data[offset] - 0xb7;

        if (offset + 1 + lengthLength > data.length) {
          logger$e.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
        }

        const length = unarrayifyInteger(data, offset + 1, lengthLength);

        if (offset + 1 + lengthLength + length > data.length) {
          logger$e.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
        }

        const result = hexlify(data.slice(offset + 1 + lengthLength, offset + 1 + lengthLength + length));
        return {
          consumed: 1 + lengthLength + length,
          result: result
        };
      } else if (data[offset] >= 0x80) {
        const length = data[offset] - 0x80;

        if (offset + 1 + length > data.length) {
          logger$e.throwError("data too short", Logger.errors.BUFFER_OVERRUN, {});
        }

        const result = hexlify(data.slice(offset + 1, offset + 1 + length));
        return {
          consumed: 1 + length,
          result: result
        };
      }

      return {
        consumed: 1,
        result: hexlify(data[offset])
      };
    }

    function decode$1(data) {
      const bytes = arrayify(data);

      const decoded = _decode(bytes, 0);

      if (decoded.consumed !== bytes.length) {
        logger$e.throwArgumentError("invalid rlp data", "data", data);
      }

      return decoded.result;
    }

    const version$a = "address/5.6.1";

    const logger$d = new Logger(version$a);

    function getChecksumAddress(address) {
      if (!isHexString(address, 20)) {
        logger$d.throwArgumentError("invalid address", "address", address);
      }

      address = address.toLowerCase();
      const chars = address.substring(2).split("");
      const expanded = new Uint8Array(40);

      for (let i = 0; i < 40; i++) {
        expanded[i] = chars[i].charCodeAt(0);
      }

      const hashed = arrayify(keccak256(expanded));

      for (let i = 0; i < 40; i += 2) {
        if (hashed[i >> 1] >> 4 >= 8) {
          chars[i] = chars[i].toUpperCase();
        }

        if ((hashed[i >> 1] & 0x0f) >= 8) {
          chars[i + 1] = chars[i + 1].toUpperCase();
        }
      }

      return "0x" + chars.join("");
    } // Shims for environments that are missing some required constants and functions


    const MAX_SAFE_INTEGER = 0x1fffffffffffff;

    function log10(x) {
      if (Math.log10) {
        return Math.log10(x);
      }

      return Math.log(x) / Math.LN10;
    } // See: https://en.wikipedia.org/wiki/International_Bank_Account_Number
    // Create lookup table


    const ibanLookup = {};

    for (let i = 0; i < 10; i++) {
      ibanLookup[String(i)] = String(i);
    }

    for (let i = 0; i < 26; i++) {
      ibanLookup[String.fromCharCode(65 + i)] = String(10 + i);
    } // How many decimal digits can we process? (for 64-bit float, this is 15)


    const safeDigits = Math.floor(log10(MAX_SAFE_INTEGER));

    function ibanChecksum(address) {
      address = address.toUpperCase();
      address = address.substring(4) + address.substring(0, 2) + "00";
      let expanded = address.split("").map(c => {
        return ibanLookup[c];
      }).join(""); // Javascript can handle integers safely up to 15 (decimal) digits

      while (expanded.length >= safeDigits) {
        let block = expanded.substring(0, safeDigits);
        expanded = parseInt(block, 10) % 97 + expanded.substring(block.length);
      }

      let checksum = String(98 - parseInt(expanded, 10) % 97);

      while (checksum.length < 2) {
        checksum = "0" + checksum;
      }

      return checksum;
    }
    function getAddress(address) {
      let result = null;

      if (typeof address !== "string") {
        logger$d.throwArgumentError("invalid address", "address", address);
      }

      if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
        // Missing the 0x prefix
        if (address.substring(0, 2) !== "0x") {
          address = "0x" + address;
        }

        result = getChecksumAddress(address); // It is a checksummed address with a bad checksum

        if (address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) && result !== address) {
          logger$d.throwArgumentError("bad address checksum", "address", address);
        } // Maybe ICAP? (we only support direct mode)

      } else if (address.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)) {
        // It is an ICAP address with a bad checksum
        if (address.substring(2, 4) !== ibanChecksum(address)) {
          logger$d.throwArgumentError("bad icap checksum", "address", address);
        }

        result = _base36To16(address.substring(4));

        while (result.length < 40) {
          result = "0" + result;
        }

        result = getChecksumAddress("0x" + result);
      } else {
        logger$d.throwArgumentError("invalid address", "address", address);
      }

      return result;
    }

    function getContractAddress(transaction) {
      let from = null;

      try {
        from = getAddress(transaction.from);
      } catch (error) {
        logger$d.throwArgumentError("missing from address", "transaction", transaction);
      }

      const nonce = stripZeros(arrayify(BigNumber.from(transaction.nonce).toHexString()));
      return getAddress(hexDataSlice(keccak256(encode$1([from, nonce])), 12));
    }

    const AddressZero = "0x0000000000000000000000000000000000000000";

    const Zero$1 = /*#__PURE__*/BigNumber.from(0);

    const HashZero = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const version$9 = "strings/5.6.1";

    const logger$c = new Logger(version$9); ///////////////////////////////

    var UnicodeNormalizationForm;

    (function (UnicodeNormalizationForm) {
      UnicodeNormalizationForm["current"] = "";
      UnicodeNormalizationForm["NFC"] = "NFC";
      UnicodeNormalizationForm["NFD"] = "NFD";
      UnicodeNormalizationForm["NFKC"] = "NFKC";
      UnicodeNormalizationForm["NFKD"] = "NFKD";
    })(UnicodeNormalizationForm || (UnicodeNormalizationForm = {}));
    var Utf8ErrorReason;

    (function (Utf8ErrorReason) {
      // A continuation byte was present where there was nothing to continue
      // - offset = the index the codepoint began in
      Utf8ErrorReason["UNEXPECTED_CONTINUE"] = "unexpected continuation byte"; // An invalid (non-continuation) byte to start a UTF-8 codepoint was found
      // - offset = the index the codepoint began in

      Utf8ErrorReason["BAD_PREFIX"] = "bad codepoint prefix"; // The string is too short to process the expected codepoint
      // - offset = the index the codepoint began in

      Utf8ErrorReason["OVERRUN"] = "string overrun"; // A missing continuation byte was expected but not found
      // - offset = the index the continuation byte was expected at

      Utf8ErrorReason["MISSING_CONTINUE"] = "missing continuation byte"; // The computed code point is outside the range for UTF-8
      // - offset       = start of this codepoint
      // - badCodepoint = the computed codepoint; outside the UTF-8 range

      Utf8ErrorReason["OUT_OF_RANGE"] = "out of UTF-8 range"; // UTF-8 strings may not contain UTF-16 surrogate pairs
      // - offset       = start of this codepoint
      // - badCodepoint = the computed codepoint; inside the UTF-16 surrogate range

      Utf8ErrorReason["UTF16_SURROGATE"] = "UTF-16 surrogate"; // The string is an overlong representation
      // - offset       = start of this codepoint
      // - badCodepoint = the computed codepoint; already bounds checked

      Utf8ErrorReason["OVERLONG"] = "overlong representation";
    })(Utf8ErrorReason || (Utf8ErrorReason = {}));

    function errorFunc(reason, offset, bytes, output, badCodepoint) {
      return logger$c.throwArgumentError(`invalid codepoint at offset ${offset}; ${reason}`, "bytes", bytes);
    }

    function ignoreFunc(reason, offset, bytes, output, badCodepoint) {
      // If there is an invalid prefix (including stray continuation), skip any additional continuation bytes
      if (reason === Utf8ErrorReason.BAD_PREFIX || reason === Utf8ErrorReason.UNEXPECTED_CONTINUE) {
        let i = 0;

        for (let o = offset + 1; o < bytes.length; o++) {
          if (bytes[o] >> 6 !== 0x02) {
            break;
          }

          i++;
        }

        return i;
      } // This byte runs us past the end of the string, so just jump to the end
      // (but the first byte was read already read and therefore skipped)


      if (reason === Utf8ErrorReason.OVERRUN) {
        return bytes.length - offset - 1;
      } // Nothing to skip


      return 0;
    }

    function replaceFunc(reason, offset, bytes, output, badCodepoint) {
      // Overlong representations are otherwise "valid" code points; just non-deistingtished
      if (reason === Utf8ErrorReason.OVERLONG) {
        output.push(badCodepoint);
        return 0;
      } // Put the replacement character into the output


      output.push(0xfffd); // Otherwise, process as if ignoring errors

      return ignoreFunc(reason, offset, bytes);
    } // Common error handing strategies


    const Utf8ErrorFuncs = Object.freeze({
      error: errorFunc,
      ignore: ignoreFunc,
      replace: replaceFunc
    }); // http://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript#13691499

    function getUtf8CodePoints(bytes, onError) {
      if (onError == null) {
        onError = Utf8ErrorFuncs.error;
      }

      bytes = arrayify(bytes);
      const result = [];
      let i = 0; // Invalid bytes are ignored

      while (i < bytes.length) {
        const c = bytes[i++]; // 0xxx xxxx

        if (c >> 7 === 0) {
          result.push(c);
          continue;
        } // Multibyte; how many bytes left for this character?


        let extraLength = null;
        let overlongMask = null; // 110x xxxx 10xx xxxx

        if ((c & 0xe0) === 0xc0) {
          extraLength = 1;
          overlongMask = 0x7f; // 1110 xxxx 10xx xxxx 10xx xxxx
        } else if ((c & 0xf0) === 0xe0) {
          extraLength = 2;
          overlongMask = 0x7ff; // 1111 0xxx 10xx xxxx 10xx xxxx 10xx xxxx
        } else if ((c & 0xf8) === 0xf0) {
          extraLength = 3;
          overlongMask = 0xffff;
        } else {
          if ((c & 0xc0) === 0x80) {
            i += onError(Utf8ErrorReason.UNEXPECTED_CONTINUE, i - 1, bytes, result);
          } else {
            i += onError(Utf8ErrorReason.BAD_PREFIX, i - 1, bytes, result);
          }

          continue;
        } // Do we have enough bytes in our data?


        if (i - 1 + extraLength >= bytes.length) {
          i += onError(Utf8ErrorReason.OVERRUN, i - 1, bytes, result);
          continue;
        } // Remove the length prefix from the char


        let res = c & (1 << 8 - extraLength - 1) - 1;

        for (let j = 0; j < extraLength; j++) {
          let nextChar = bytes[i]; // Invalid continuation byte

          if ((nextChar & 0xc0) != 0x80) {
            i += onError(Utf8ErrorReason.MISSING_CONTINUE, i, bytes, result);
            res = null;
            break;
          }
          res = res << 6 | nextChar & 0x3f;
          i++;
        } // See above loop for invalid continuation byte


        if (res === null) {
          continue;
        } // Maximum code point


        if (res > 0x10ffff) {
          i += onError(Utf8ErrorReason.OUT_OF_RANGE, i - 1 - extraLength, bytes, result, res);
          continue;
        } // Reserved for UTF-16 surrogate halves


        if (res >= 0xd800 && res <= 0xdfff) {
          i += onError(Utf8ErrorReason.UTF16_SURROGATE, i - 1 - extraLength, bytes, result, res);
          continue;
        } // Check for overlong sequences (more bytes than needed)


        if (res <= overlongMask) {
          i += onError(Utf8ErrorReason.OVERLONG, i - 1 - extraLength, bytes, result, res);
          continue;
        }

        result.push(res);
      }

      return result;
    } // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array


    function toUtf8Bytes(str, form = UnicodeNormalizationForm.current) {
      if (form != UnicodeNormalizationForm.current) {
        logger$c.checkNormalize();
        str = str.normalize(form);
      }

      let result = [];

      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);

        if (c < 0x80) {
          result.push(c);
        } else if (c < 0x800) {
          result.push(c >> 6 | 0xc0);
          result.push(c & 0x3f | 0x80);
        } else if ((c & 0xfc00) == 0xd800) {
          i++;
          const c2 = str.charCodeAt(i);

          if (i >= str.length || (c2 & 0xfc00) !== 0xdc00) {
            throw new Error("invalid utf-8 string");
          } // Surrogate Pair


          const pair = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
          result.push(pair >> 18 | 0xf0);
          result.push(pair >> 12 & 0x3f | 0x80);
          result.push(pair >> 6 & 0x3f | 0x80);
          result.push(pair & 0x3f | 0x80);
        } else {
          result.push(c >> 12 | 0xe0);
          result.push(c >> 6 & 0x3f | 0x80);
          result.push(c & 0x3f | 0x80);
        }
      }

      return arrayify(result);
    }
    function _toUtf8String(codePoints) {
      return codePoints.map(codePoint => {
        if (codePoint <= 0xffff) {
          return String.fromCharCode(codePoint);
        }

        codePoint -= 0x10000;
        return String.fromCharCode((codePoint >> 10 & 0x3ff) + 0xd800, (codePoint & 0x3ff) + 0xdc00);
      }).join("");
    }
    function toUtf8String(bytes, onError) {
      return _toUtf8String(getUtf8CodePoints(bytes, onError));
    }
    function toUtf8CodePoints(str, form = UnicodeNormalizationForm.current) {
      return getUtf8CodePoints(toUtf8Bytes(str, form));
    }

    function bytes2(data) {
      if (data.length % 4 !== 0) {
        throw new Error("bad data");
      }

      let result = [];

      for (let i = 0; i < data.length; i += 4) {
        result.push(parseInt(data.substring(i, i + 4), 16));
      }

      return result;
    }

    function createTable(data, func) {
      if (!func) {
        func = function (value) {
          return [parseInt(value, 16)];
        };
      }

      let lo = 0;
      let result = {};
      data.split(",").forEach(pair => {
        let comps = pair.split(":");
        lo += parseInt(comps[0], 16);
        result[lo] = func(comps[1]);
      });
      return result;
    }

    function createRangeTable(data) {
      let hi = 0;
      return data.split(",").map(v => {
        let comps = v.split("-");

        if (comps.length === 1) {
          comps[1] = "0";
        } else if (comps[1] === "") {
          comps[1] = "1";
        }

        let lo = hi + parseInt(comps[0], 16);
        hi = parseInt(comps[1], 16);
        return {
          l: lo,
          h: hi
        };
      });
    }

    function matchMap(value, ranges) {
      let lo = 0;

      for (let i = 0; i < ranges.length; i++) {
        let range = ranges[i];
        lo += range.l;

        if (value >= lo && value <= lo + range.h && (value - lo) % (range.d || 1) === 0) {
          if (range.e && range.e.indexOf(value - lo) !== -1) {
            continue;
          }

          return range;
        }
      }

      return null;
    }

    const Table_A_1_ranges = createRangeTable("221,13-1b,5f-,40-10,51-f,11-3,3-3,2-2,2-4,8,2,15,2d,28-8,88,48,27-,3-5,11-20,27-,8,28,3-5,12,18,b-a,1c-4,6-16,2-d,2-2,2,1b-4,17-9,8f-,10,f,1f-2,1c-34,33-14e,4,36-,13-,6-2,1a-f,4,9-,3-,17,8,2-2,5-,2,8-,3-,4-8,2-3,3,6-,16-6,2-,7-3,3-,17,8,3,3,3-,2,6-3,3-,4-a,5,2-6,10-b,4,8,2,4,17,8,3,6-,b,4,4-,2-e,2-4,b-10,4,9-,3-,17,8,3-,5-,9-2,3-,4-7,3-3,3,4-3,c-10,3,7-2,4,5-2,3,2,3-2,3-2,4-2,9,4-3,6-2,4,5-8,2-e,d-d,4,9,4,18,b,6-3,8,4,5-6,3-8,3-3,b-11,3,9,4,18,b,6-3,8,4,5-6,3-6,2,3-3,b-11,3,9,4,18,11-3,7-,4,5-8,2-7,3-3,b-11,3,13-2,19,a,2-,8-2,2-3,7,2,9-11,4-b,3b-3,1e-24,3,2-,3,2-,2-5,5,8,4,2,2-,3,e,4-,6,2,7-,b-,3-21,49,23-5,1c-3,9,25,10-,2-2f,23,6,3,8-2,5-5,1b-45,27-9,2a-,2-3,5b-4,45-4,53-5,8,40,2,5-,8,2,5-,28,2,5-,20,2,5-,8,2,5-,8,8,18,20,2,5-,8,28,14-5,1d-22,56-b,277-8,1e-2,52-e,e,8-a,18-8,15-b,e,4,3-b,5e-2,b-15,10,b-5,59-7,2b-555,9d-3,5b-5,17-,7-,27-,7-,9,2,2,2,20-,36,10,f-,7,14-,4,a,54-3,2-6,6-5,9-,1c-10,13-1d,1c-14,3c-,10-6,32-b,240-30,28-18,c-14,a0,115-,3,66-,b-76,5,5-,1d,24,2,5-2,2,8-,35-2,19,f-10,1d-3,311-37f,1b,5a-b,d7-19,d-3,41,57-,68-4,29-3,5f,29-37,2e-2,25-c,2c-2,4e-3,30,78-3,64-,20,19b7-49,51a7-59,48e-2,38-738,2ba5-5b,222f-,3c-94,8-b,6-4,1b,6,2,3,3,6d-20,16e-f,41-,37-7,2e-2,11-f,5-b,18-,b,14,5-3,6,88-,2,bf-2,7-,7-,7-,4-2,8,8-9,8-2ff,20,5-b,1c-b4,27-,27-cbb1,f7-9,28-2,b5-221,56,48,3-,2-,3-,5,d,2,5,3,42,5-,9,8,1d,5,6,2-2,8,153-3,123-3,33-27fd,a6da-5128,21f-5df,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3,2-1d,61-ff7d"); // @TODO: Make this relative...

    const Table_B_1_flags = "ad,34f,1806,180b,180c,180d,200b,200c,200d,2060,feff".split(",").map(v => parseInt(v, 16));
    const Table_B_2_ranges = [{
      h: 25,
      s: 32,
      l: 65
    }, {
      h: 30,
      s: 32,
      e: [23],
      l: 127
    }, {
      h: 54,
      s: 1,
      e: [48],
      l: 64,
      d: 2
    }, {
      h: 14,
      s: 1,
      l: 57,
      d: 2
    }, {
      h: 44,
      s: 1,
      l: 17,
      d: 2
    }, {
      h: 10,
      s: 1,
      e: [2, 6, 8],
      l: 61,
      d: 2
    }, {
      h: 16,
      s: 1,
      l: 68,
      d: 2
    }, {
      h: 84,
      s: 1,
      e: [18, 24, 66],
      l: 19,
      d: 2
    }, {
      h: 26,
      s: 32,
      e: [17],
      l: 435
    }, {
      h: 22,
      s: 1,
      l: 71,
      d: 2
    }, {
      h: 15,
      s: 80,
      l: 40
    }, {
      h: 31,
      s: 32,
      l: 16
    }, {
      h: 32,
      s: 1,
      l: 80,
      d: 2
    }, {
      h: 52,
      s: 1,
      l: 42,
      d: 2
    }, {
      h: 12,
      s: 1,
      l: 55,
      d: 2
    }, {
      h: 40,
      s: 1,
      e: [38],
      l: 15,
      d: 2
    }, {
      h: 14,
      s: 1,
      l: 48,
      d: 2
    }, {
      h: 37,
      s: 48,
      l: 49
    }, {
      h: 148,
      s: 1,
      l: 6351,
      d: 2
    }, {
      h: 88,
      s: 1,
      l: 160,
      d: 2
    }, {
      h: 15,
      s: 16,
      l: 704
    }, {
      h: 25,
      s: 26,
      l: 854
    }, {
      h: 25,
      s: 32,
      l: 55915
    }, {
      h: 37,
      s: 40,
      l: 1247
    }, {
      h: 25,
      s: -119711,
      l: 53248
    }, {
      h: 25,
      s: -119763,
      l: 52
    }, {
      h: 25,
      s: -119815,
      l: 52
    }, {
      h: 25,
      s: -119867,
      e: [1, 4, 5, 7, 8, 11, 12, 17],
      l: 52
    }, {
      h: 25,
      s: -119919,
      l: 52
    }, {
      h: 24,
      s: -119971,
      e: [2, 7, 8, 17],
      l: 52
    }, {
      h: 24,
      s: -120023,
      e: [2, 7, 13, 15, 16, 17],
      l: 52
    }, {
      h: 25,
      s: -120075,
      l: 52
    }, {
      h: 25,
      s: -120127,
      l: 52
    }, {
      h: 25,
      s: -120179,
      l: 52
    }, {
      h: 25,
      s: -120231,
      l: 52
    }, {
      h: 25,
      s: -120283,
      l: 52
    }, {
      h: 25,
      s: -120335,
      l: 52
    }, {
      h: 24,
      s: -119543,
      e: [17],
      l: 56
    }, {
      h: 24,
      s: -119601,
      e: [17],
      l: 58
    }, {
      h: 24,
      s: -119659,
      e: [17],
      l: 58
    }, {
      h: 24,
      s: -119717,
      e: [17],
      l: 58
    }, {
      h: 24,
      s: -119775,
      e: [17],
      l: 58
    }];
    const Table_B_2_lut_abs = createTable("b5:3bc,c3:ff,7:73,2:253,5:254,3:256,1:257,5:259,1:25b,3:260,1:263,2:269,1:268,5:26f,1:272,2:275,7:280,3:283,5:288,3:28a,1:28b,5:292,3f:195,1:1bf,29:19e,125:3b9,8b:3b2,1:3b8,1:3c5,3:3c6,1:3c0,1a:3ba,1:3c1,1:3c3,2:3b8,1:3b5,1bc9:3b9,1c:1f76,1:1f77,f:1f7a,1:1f7b,d:1f78,1:1f79,1:1f7c,1:1f7d,107:63,5:25b,4:68,1:68,1:68,3:69,1:69,1:6c,3:6e,4:70,1:71,1:72,1:72,1:72,7:7a,2:3c9,2:7a,2:6b,1:e5,1:62,1:63,3:65,1:66,2:6d,b:3b3,1:3c0,6:64,1b574:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3");
    const Table_B_2_lut_rel = createTable("179:1,2:1,2:1,5:1,2:1,a:4f,a:1,8:1,2:1,2:1,3:1,5:1,3:1,4:1,2:1,3:1,4:1,8:2,1:1,2:2,1:1,2:2,27:2,195:26,2:25,1:25,1:25,2:40,2:3f,1:3f,33:1,11:-6,1:-9,1ac7:-3a,6d:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,b:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,c:-8,2:-8,2:-8,2:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,49:-8,1:-8,1:-4a,1:-4a,d:-56,1:-56,1:-56,1:-56,d:-8,1:-8,f:-8,1:-8,3:-7");
    const Table_B_2_complex = createTable("df:00730073,51:00690307,19:02BC006E,a7:006A030C,18a:002003B9,16:03B903080301,20:03C503080301,1d7:05650582,190f:00680331,1:00740308,1:0077030A,1:0079030A,1:006102BE,b6:03C50313,2:03C503130300,2:03C503130301,2:03C503130342,2a:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,3:1F7003B9,1:03B103B9,1:03AC03B9,2:03B10342,1:03B1034203B9,5:03B103B9,6:1F7403B9,1:03B703B9,1:03AE03B9,2:03B70342,1:03B7034203B9,5:03B703B9,6:03B903080300,1:03B903080301,3:03B90342,1:03B903080342,b:03C503080300,1:03C503080301,1:03C10313,2:03C50342,1:03C503080342,b:1F7C03B9,1:03C903B9,1:03CE03B9,2:03C90342,1:03C9034203B9,5:03C903B9,ac:00720073,5b:00B00063,6:00B00066,d:006E006F,a:0073006D,1:00740065006C,1:0074006D,124f:006800700061,2:00610075,2:006F0076,b:00700061,1:006E0061,1:03BC0061,1:006D0061,1:006B0061,1:006B0062,1:006D0062,1:00670062,3:00700066,1:006E0066,1:03BC0066,4:0068007A,1:006B0068007A,1:006D0068007A,1:00670068007A,1:00740068007A,15:00700061,1:006B00700061,1:006D00700061,1:006700700061,8:00700076,1:006E0076,1:03BC0076,1:006D0076,1:006B0076,1:006D0076,1:00700077,1:006E0077,1:03BC0077,1:006D0077,1:006B0077,1:006D0077,1:006B03C9,1:006D03C9,2:00620071,3:00632215006B0067,1:0063006F002E,1:00640062,1:00670079,2:00680070,2:006B006B,1:006B006D,9:00700068,2:00700070006D,1:00700072,2:00730076,1:00770062,c723:00660066,1:00660069,1:0066006C,1:006600660069,1:00660066006C,1:00730074,1:00730074,d:05740576,1:05740565,1:0574056B,1:057E0576,1:0574056D", bytes2);
    const Table_C_ranges = createRangeTable("80-20,2a0-,39c,32,f71,18e,7f2-f,19-7,30-4,7-5,f81-b,5,a800-20ff,4d1-1f,110,fa-6,d174-7,2e84-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,2,1f-5f,ff7f-20001");

    function flatten(values) {
      return values.reduce((accum, value) => {
        value.forEach(value => {
          accum.push(value);
        });
        return accum;
      }, []);
    }

    function _nameprepTableA1(codepoint) {
      return !!matchMap(codepoint, Table_A_1_ranges);
    }
    function _nameprepTableB2(codepoint) {
      let range = matchMap(codepoint, Table_B_2_ranges);

      if (range) {
        return [codepoint + range.s];
      }

      let codes = Table_B_2_lut_abs[codepoint];

      if (codes) {
        return codes;
      }

      let shift = Table_B_2_lut_rel[codepoint];

      if (shift) {
        return [codepoint + shift[0]];
      }

      let complex = Table_B_2_complex[codepoint];

      if (complex) {
        return complex;
      }

      return null;
    }
    function _nameprepTableC(codepoint) {
      return !!matchMap(codepoint, Table_C_ranges);
    }
    function nameprep(value) {
      // This allows platforms with incomplete normalize to bypass
      // it for very basic names which the built-in toLowerCase
      // will certainly handle correctly
      if (value.match(/^[a-z0-9-]*$/i) && value.length <= 59) {
        return value.toLowerCase();
      } // Get the code points (keeping the current normalization)


      let codes = toUtf8CodePoints(value);
      codes = flatten(codes.map(code => {
        // Substitute Table B.1 (Maps to Nothing)
        if (Table_B_1_flags.indexOf(code) >= 0) {
          return [];
        }

        if (code >= 0xfe00 && code <= 0xfe0f) {
          return [];
        } // Substitute Table B.2 (Case Folding)


        let codesTableB2 = _nameprepTableB2(code);

        if (codesTableB2) {
          return codesTableB2;
        } // No Substitution


        return [code];
      })); // Normalize using form KC

      codes = toUtf8CodePoints(_toUtf8String(codes), UnicodeNormalizationForm.NFKC); // Prohibit Tables C.1.2, C.2.2, C.3, C.4, C.5, C.6, C.7, C.8, C.9

      codes.forEach(code => {
        if (_nameprepTableC(code)) {
          throw new Error("STRINGPREP_CONTAINS_PROHIBITED");
        }
      }); // Prohibit Unassigned Code Points (Table A.1)

      codes.forEach(code => {
        if (_nameprepTableA1(code)) {
          throw new Error("STRINGPREP_CONTAINS_UNASSIGNED");
        }
      }); // IDNA extras

      let name = _toUtf8String(codes); // IDNA: 4.2.3.1


      if (name.substring(0, 1) === "-" || name.substring(2, 4) === "--" || name.substring(name.length - 1) === "-") {
        throw new Error("invalid hyphen");
      } // IDNA: 4.2.4


      if (name.length > 63) {
        throw new Error("too long");
      }

      return name;
    }

    function id(text) {
      return keccak256(toUtf8Bytes(text));
    }

    const version$8 = "hash/5.6.1";

    const logger$b = new Logger(version$8);
    const Zeros = new Uint8Array(32);
    Zeros.fill(0);
    const Partition = new RegExp("^((.*)\\.)?([^.]+)$");
    function namehash(name) {
      /* istanbul ignore if */
      if (typeof name !== "string") {
        logger$b.throwArgumentError("invalid ENS name; not a string", "name", name);
      }

      let current = name;
      let result = Zeros;

      while (current.length) {
        const partition = current.match(Partition);

        if (partition == null || partition[2] === "") {
          logger$b.throwArgumentError("invalid ENS address; missing component", "name", name);
        }

        const label = toUtf8Bytes(nameprep(partition[3]));
        result = keccak256(concat([result, keccak256(label)]));
        current = partition[2] || "";
      }

      return hexlify(result);
    }
    function dnsEncode(name) {
      return hexlify(concat(name.split(".").map(comp => {
        // We jam in an _ prefix to fill in with the length later
        // Note: Nameprep throws if the component is over 63 bytes
        const bytes = toUtf8Bytes("_" + nameprep(comp));
        bytes[0] = bytes.length - 1;
        return bytes;
      }))) + "00";
    }

    var __awaiter$6 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    const logger$a = new Logger(version$8);
    const padding = new Uint8Array(32);
    padding.fill(0);
    const NegativeOne = BigNumber.from(-1);
    const Zero = BigNumber.from(0);
    const One = BigNumber.from(1);
    const MaxUint256 = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

    function hexPadRight(value) {
      const bytes = arrayify(value);
      const padOffset = bytes.length % 32;

      if (padOffset) {
        return hexConcat([bytes, padding.slice(padOffset)]);
      }

      return hexlify(bytes);
    }

    const hexTrue = hexZeroPad(One.toHexString(), 32);
    const hexFalse = hexZeroPad(Zero.toHexString(), 32);
    const domainFieldTypes = {
      name: "string",
      version: "string",
      chainId: "uint256",
      verifyingContract: "address",
      salt: "bytes32"
    };
    const domainFieldNames = ["name", "version", "chainId", "verifyingContract", "salt"];

    function checkString(key) {
      return function (value) {
        if (typeof value !== "string") {
          logger$a.throwArgumentError(`invalid domain value for ${JSON.stringify(key)}`, `domain.${key}`, value);
        }

        return value;
      };
    }

    const domainChecks = {
      name: checkString("name"),
      version: checkString("version"),
      chainId: function (value) {
        try {
          return BigNumber.from(value).toString();
        } catch (error) {}

        return logger$a.throwArgumentError(`invalid domain value for "chainId"`, "domain.chainId", value);
      },
      verifyingContract: function (value) {
        try {
          return getAddress(value).toLowerCase();
        } catch (error) {}

        return logger$a.throwArgumentError(`invalid domain value "verifyingContract"`, "domain.verifyingContract", value);
      },
      salt: function (value) {
        try {
          const bytes = arrayify(value);

          if (bytes.length !== 32) {
            throw new Error("bad length");
          }

          return hexlify(bytes);
        } catch (error) {}

        return logger$a.throwArgumentError(`invalid domain value "salt"`, "domain.salt", value);
      }
    };

    function getBaseEncoder(type) {
      // intXX and uintXX
      {
        const match = type.match(/^(u?)int(\d*)$/);

        if (match) {
          const signed = match[1] === "";
          const width = parseInt(match[2] || "256");

          if (width % 8 !== 0 || width > 256 || match[2] && match[2] !== String(width)) {
            logger$a.throwArgumentError("invalid numeric width", "type", type);
          }

          const boundsUpper = MaxUint256.mask(signed ? width - 1 : width);
          const boundsLower = signed ? boundsUpper.add(One).mul(NegativeOne) : Zero;
          return function (value) {
            const v = BigNumber.from(value);

            if (v.lt(boundsLower) || v.gt(boundsUpper)) {
              logger$a.throwArgumentError(`value out-of-bounds for ${type}`, "value", value);
            }

            return hexZeroPad(v.toTwos(256).toHexString(), 32);
          };
        }
      } // bytesXX

      {
        const match = type.match(/^bytes(\d+)$/);

        if (match) {
          const width = parseInt(match[1]);

          if (width === 0 || width > 32 || match[1] !== String(width)) {
            logger$a.throwArgumentError("invalid bytes width", "type", type);
          }

          return function (value) {
            const bytes = arrayify(value);

            if (bytes.length !== width) {
              logger$a.throwArgumentError(`invalid length for ${type}`, "value", value);
            }

            return hexPadRight(value);
          };
        }
      }

      switch (type) {
        case "address":
          return function (value) {
            return hexZeroPad(getAddress(value), 32);
          };

        case "bool":
          return function (value) {
            return !value ? hexFalse : hexTrue;
          };

        case "bytes":
          return function (value) {
            return keccak256(value);
          };

        case "string":
          return function (value) {
            return id(value);
          };
      }

      return null;
    }

    function encodeType(name, fields) {
      return `${name}(${fields.map(({
    name,
    type
  }) => type + " " + name).join(",")})`;
    }

    class TypedDataEncoder {
      constructor(types) {
        defineReadOnly(this, "types", Object.freeze(deepCopy(types)));
        defineReadOnly(this, "_encoderCache", {});
        defineReadOnly(this, "_types", {}); // Link struct types to their direct child structs

        const links = {}; // Link structs to structs which contain them as a child

        const parents = {}; // Link all subtypes within a given struct

        const subtypes = {};
        Object.keys(types).forEach(type => {
          links[type] = {};
          parents[type] = [];
          subtypes[type] = {};
        });

        for (const name in types) {
          const uniqueNames = {};
          types[name].forEach(field => {
            // Check each field has a unique name
            if (uniqueNames[field.name]) {
              logger$a.throwArgumentError(`duplicate variable name ${JSON.stringify(field.name)} in ${JSON.stringify(name)}`, "types", types);
            }

            uniqueNames[field.name] = true; // Get the base type (drop any array specifiers)

            const baseType = field.type.match(/^([^\x5b]*)(\x5b|$)/)[1];

            if (baseType === name) {
              logger$a.throwArgumentError(`circular type reference to ${JSON.stringify(baseType)}`, "types", types);
            } // Is this a base encoding type?


            const encoder = getBaseEncoder(baseType);

            if (encoder) {
              return;
            }

            if (!parents[baseType]) {
              logger$a.throwArgumentError(`unknown type ${JSON.stringify(baseType)}`, "types", types);
            } // Add linkage


            parents[baseType].push(name);
            links[name][baseType] = true;
          });
        } // Deduce the primary type


        const primaryTypes = Object.keys(parents).filter(n => parents[n].length === 0);

        if (primaryTypes.length === 0) {
          logger$a.throwArgumentError("missing primary type", "types", types);
        } else if (primaryTypes.length > 1) {
          logger$a.throwArgumentError(`ambiguous primary types or unused types: ${primaryTypes.map(t => JSON.stringify(t)).join(", ")}`, "types", types);
        }

        defineReadOnly(this, "primaryType", primaryTypes[0]); // Check for circular type references

        function checkCircular(type, found) {
          if (found[type]) {
            logger$a.throwArgumentError(`circular type reference to ${JSON.stringify(type)}`, "types", types);
          }

          found[type] = true;
          Object.keys(links[type]).forEach(child => {
            if (!parents[child]) {
              return;
            } // Recursively check children


            checkCircular(child, found); // Mark all ancestors as having this decendant

            Object.keys(found).forEach(subtype => {
              subtypes[subtype][child] = true;
            });
          });
          delete found[type];
        }

        checkCircular(this.primaryType, {}); // Compute each fully describe type

        for (const name in subtypes) {
          const st = Object.keys(subtypes[name]);
          st.sort();
          this._types[name] = encodeType(name, types[name]) + st.map(t => encodeType(t, types[t])).join("");
        }
      }

      getEncoder(type) {
        let encoder = this._encoderCache[type];

        if (!encoder) {
          encoder = this._encoderCache[type] = this._getEncoder(type);
        }

        return encoder;
      }

      _getEncoder(type) {
        // Basic encoder type (address, bool, uint256, etc)
        {
          const encoder = getBaseEncoder(type);

          if (encoder) {
            return encoder;
          }
        } // Array

        const match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);

        if (match) {
          const subtype = match[1];
          const subEncoder = this.getEncoder(subtype);
          const length = parseInt(match[3]);
          return value => {
            if (length >= 0 && value.length !== length) {
              logger$a.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
            }

            let result = value.map(subEncoder);

            if (this._types[subtype]) {
              result = result.map(keccak256);
            }

            return keccak256(hexConcat(result));
          };
        } // Struct


        const fields = this.types[type];

        if (fields) {
          const encodedType = id(this._types[type]);
          return value => {
            const values = fields.map(({
              name,
              type
            }) => {
              const result = this.getEncoder(type)(value[name]);

              if (this._types[type]) {
                return keccak256(result);
              }

              return result;
            });
            values.unshift(encodedType);
            return hexConcat(values);
          };
        }

        return logger$a.throwArgumentError(`unknown type: ${type}`, "type", type);
      }

      encodeType(name) {
        const result = this._types[name];

        if (!result) {
          logger$a.throwArgumentError(`unknown type: ${JSON.stringify(name)}`, "name", name);
        }

        return result;
      }

      encodeData(type, value) {
        return this.getEncoder(type)(value);
      }

      hashStruct(name, value) {
        return keccak256(this.encodeData(name, value));
      }

      encode(value) {
        return this.encodeData(this.primaryType, value);
      }

      hash(value) {
        return this.hashStruct(this.primaryType, value);
      }

      _visit(type, value, callback) {
        // Basic encoder type (address, bool, uint256, etc)
        {
          const encoder = getBaseEncoder(type);

          if (encoder) {
            return callback(type, value);
          }
        } // Array

        const match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);

        if (match) {
          const subtype = match[1];
          const length = parseInt(match[3]);

          if (length >= 0 && value.length !== length) {
            logger$a.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
          }

          return value.map(v => this._visit(subtype, v, callback));
        } // Struct


        const fields = this.types[type];

        if (fields) {
          return fields.reduce((accum, {
            name,
            type
          }) => {
            accum[name] = this._visit(type, value[name], callback);
            return accum;
          }, {});
        }

        return logger$a.throwArgumentError(`unknown type: ${type}`, "type", type);
      }

      visit(value, callback) {
        return this._visit(this.primaryType, value, callback);
      }

      static from(types) {
        return new TypedDataEncoder(types);
      }

      static getPrimaryType(types) {
        return TypedDataEncoder.from(types).primaryType;
      }

      static hashStruct(name, types, value) {
        return TypedDataEncoder.from(types).hashStruct(name, value);
      }

      static hashDomain(domain) {
        const domainFields = [];

        for (const name in domain) {
          const type = domainFieldTypes[name];

          if (!type) {
            logger$a.throwArgumentError(`invalid typed-data domain key: ${JSON.stringify(name)}`, "domain", domain);
          }

          domainFields.push({
            name,
            type
          });
        }

        domainFields.sort((a, b) => {
          return domainFieldNames.indexOf(a.name) - domainFieldNames.indexOf(b.name);
        });
        return TypedDataEncoder.hashStruct("EIP712Domain", {
          EIP712Domain: domainFields
        }, domain);
      }

      static encode(domain, types, value) {
        return hexConcat(["0x1901", TypedDataEncoder.hashDomain(domain), TypedDataEncoder.from(types).hash(value)]);
      }

      static hash(domain, types, value) {
        return keccak256(TypedDataEncoder.encode(domain, types, value));
      } // Replaces all address types with ENS names with their looked up address


      static resolveNames(domain, types, value, resolveName) {
        return __awaiter$6(this, void 0, void 0, function* () {
          // Make a copy to isolate it from the object passed in
          domain = shallowCopy(domain); // Look up all ENS names

          const ensCache = {}; // Do we need to look up the domain's verifyingContract?

          if (domain.verifyingContract && !isHexString(domain.verifyingContract, 20)) {
            ensCache[domain.verifyingContract] = "0x";
          } // We are going to use the encoder to visit all the base values


          const encoder = TypedDataEncoder.from(types); // Get a list of all the addresses

          encoder.visit(value, (type, value) => {
            if (type === "address" && !isHexString(value, 20)) {
              ensCache[value] = "0x";
            }

            return value;
          }); // Lookup each name

          for (const name in ensCache) {
            ensCache[name] = yield resolveName(name);
          } // Replace the domain verifyingContract if needed


          if (domain.verifyingContract && ensCache[domain.verifyingContract]) {
            domain.verifyingContract = ensCache[domain.verifyingContract];
          } // Replace all ENS names with their address


          value = encoder.visit(value, (type, value) => {
            if (type === "address" && ensCache[value]) {
              return ensCache[value];
            }

            return value;
          });
          return {
            domain,
            value
          };
        });
      }

      static getPayload(domain, types, value) {
        // Validate the domain fields
        TypedDataEncoder.hashDomain(domain); // Derive the EIP712Domain Struct reference type

        const domainValues = {};
        const domainTypes = [];
        domainFieldNames.forEach(name => {
          const value = domain[name];

          if (value == null) {
            return;
          }

          domainValues[name] = domainChecks[name](value);
          domainTypes.push({
            name,
            type: domainFieldTypes[name]
          });
        });
        const encoder = TypedDataEncoder.from(types);
        const typesWithDomain = shallowCopy(types);

        if (typesWithDomain.EIP712Domain) {
          logger$a.throwArgumentError("types must not contain EIP712Domain type", "types.EIP712Domain", types);
        } else {
          typesWithDomain.EIP712Domain = domainTypes;
        } // Validate the data structures and types


        encoder.encode(value);
        return {
          types: typesWithDomain,
          domain: domainValues,
          primaryType: encoder.primaryType,
          message: encoder.visit(value, (type, value) => {
            // bytes
            if (type.match(/^bytes(\d*)/)) {
              return hexlify(arrayify(value));
            } // uint or int


            if (type.match(/^u?int/)) {
              return BigNumber.from(value).toString();
            }

            switch (type) {
              case "address":
                return value.toLowerCase();

              case "bool":
                return !!value;

              case "string":
                if (typeof value !== "string") {
                  logger$a.throwArgumentError(`invalid string`, "value", value);
                }

                return value;
            }

            return logger$a.throwArgumentError("unsupported type", "type", type);
          })
        };
      }

    }

    const version$7 = "abstract-provider/5.6.1";

    var __awaiter$5 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    const logger$9 = new Logger(version$7);
    //    call(transaction: TransactionRequest): Promise<TransactionResponse>;
    //};

    class ForkEvent extends Description {
      static isForkEvent(value) {
        return !!(value && value._isForkEvent);
      }

    }
    // Exported Abstracts

    class Provider {
      constructor() {
        logger$9.checkAbstract(new.target, Provider);
        defineReadOnly(this, "_isProvider", true);
      }

      getFeeData() {
        return __awaiter$5(this, void 0, void 0, function* () {
          const {
            block,
            gasPrice
          } = yield resolveProperties({
            block: this.getBlock("latest"),
            gasPrice: this.getGasPrice().catch(error => {
              // @TODO: Why is this now failing on Calaveras?
              //console.log(error);
              return null;
            })
          });
          let maxFeePerGas = null,
              maxPriorityFeePerGas = null;

          if (block && block.baseFeePerGas) {
            // We may want to compute this more accurately in the future,
            // using the formula "check if the base fee is correct".
            // See: https://eips.ethereum.org/EIPS/eip-1559
            maxPriorityFeePerGas = BigNumber.from("1500000000");
            maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
          }

          return {
            maxFeePerGas,
            maxPriorityFeePerGas,
            gasPrice
          };
        });
      } // Alias for "on"


      addListener(eventName, listener) {
        return this.on(eventName, listener);
      } // Alias for "off"


      removeListener(eventName, listener) {
        return this.off(eventName, listener);
      }

      static isProvider(value) {
        return !!(value && value._isProvider);
      }

    }

    const version$6 = "abstract-signer/5.6.2";

    var __awaiter$4 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    const logger$8 = new Logger(version$6);
    const allowedTransactionKeys$1 = ["accessList", "ccipReadEnabled", "chainId", "customData", "data", "from", "gasLimit", "gasPrice", "maxFeePerGas", "maxPriorityFeePerGas", "nonce", "to", "type", "value"];
    const forwardErrors = [Logger.errors.INSUFFICIENT_FUNDS, Logger.errors.NONCE_EXPIRED, Logger.errors.REPLACEMENT_UNDERPRICED];
    class Signer {
      ///////////////////
      // Sub-classes MUST call super
      constructor() {
        logger$8.checkAbstract(new.target, Signer);
        defineReadOnly(this, "_isSigner", true);
      } ///////////////////
      // Sub-classes MAY override these


      getBalance(blockTag) {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("getBalance");

          return yield this.provider.getBalance(this.getAddress(), blockTag);
        });
      }

      getTransactionCount(blockTag) {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("getTransactionCount");

          return yield this.provider.getTransactionCount(this.getAddress(), blockTag);
        });
      } // Populates "from" if unspecified, and estimates the gas for the transaction


      estimateGas(transaction) {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("estimateGas");

          const tx = yield resolveProperties(this.checkTransaction(transaction));
          return yield this.provider.estimateGas(tx);
        });
      } // Populates "from" if unspecified, and calls with the transaction


      call(transaction, blockTag) {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("call");

          const tx = yield resolveProperties(this.checkTransaction(transaction));
          return yield this.provider.call(tx, blockTag);
        });
      } // Populates all fields in a transaction, signs it and sends it to the network


      sendTransaction(transaction) {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("sendTransaction");

          const tx = yield this.populateTransaction(transaction);
          const signedTx = yield this.signTransaction(tx);
          return yield this.provider.sendTransaction(signedTx);
        });
      }

      getChainId() {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("getChainId");

          const network = yield this.provider.getNetwork();
          return network.chainId;
        });
      }

      getGasPrice() {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("getGasPrice");

          return yield this.provider.getGasPrice();
        });
      }

      getFeeData() {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("getFeeData");

          return yield this.provider.getFeeData();
        });
      }

      resolveName(name) {
        return __awaiter$4(this, void 0, void 0, function* () {
          this._checkProvider("resolveName");

          return yield this.provider.resolveName(name);
        });
      } // Checks a transaction does not contain invalid keys and if
      // no "from" is provided, populates it.
      // - does NOT require a provider
      // - adds "from" is not present
      // - returns a COPY (safe to mutate the result)
      // By default called from: (overriding these prevents it)
      //   - call
      //   - estimateGas
      //   - populateTransaction (and therefor sendTransaction)


      checkTransaction(transaction) {
        for (const key in transaction) {
          if (allowedTransactionKeys$1.indexOf(key) === -1) {
            logger$8.throwArgumentError("invalid transaction key: " + key, "transaction", transaction);
          }
        }

        const tx = shallowCopy(transaction);

        if (tx.from == null) {
          tx.from = this.getAddress();
        } else {
          // Make sure any provided address matches this signer
          tx.from = Promise.all([Promise.resolve(tx.from), this.getAddress()]).then(result => {
            if (result[0].toLowerCase() !== result[1].toLowerCase()) {
              logger$8.throwArgumentError("from address mismatch", "transaction", transaction);
            }

            return result[0];
          });
        }

        return tx;
      } // Populates ALL keys for a transaction and checks that "from" matches
      // this Signer. Should be used by sendTransaction but NOT by signTransaction.
      // By default called from: (overriding these prevents it)
      //   - sendTransaction
      //
      // Notes:
      //  - We allow gasPrice for EIP-1559 as long as it matches maxFeePerGas


      populateTransaction(transaction) {
        return __awaiter$4(this, void 0, void 0, function* () {
          const tx = yield resolveProperties(this.checkTransaction(transaction));

          if (tx.to != null) {
            tx.to = Promise.resolve(tx.to).then(to => __awaiter$4(this, void 0, void 0, function* () {
              if (to == null) {
                return null;
              }

              const address = yield this.resolveName(to);

              if (address == null) {
                logger$8.throwArgumentError("provided ENS name resolves to null", "tx.to", to);
              }

              return address;
            })); // Prevent this error from causing an UnhandledPromiseException

            tx.to.catch(error => {});
          } // Do not allow mixing pre-eip-1559 and eip-1559 properties


          const hasEip1559 = tx.maxFeePerGas != null || tx.maxPriorityFeePerGas != null;

          if (tx.gasPrice != null && (tx.type === 2 || hasEip1559)) {
            logger$8.throwArgumentError("eip-1559 transaction do not support gasPrice", "transaction", transaction);
          } else if ((tx.type === 0 || tx.type === 1) && hasEip1559) {
            logger$8.throwArgumentError("pre-eip-1559 transaction do not support maxFeePerGas/maxPriorityFeePerGas", "transaction", transaction);
          }

          if ((tx.type === 2 || tx.type == null) && tx.maxFeePerGas != null && tx.maxPriorityFeePerGas != null) {
            // Fully-formed EIP-1559 transaction (skip getFeeData)
            tx.type = 2;
          } else if (tx.type === 0 || tx.type === 1) {
            // Explicit Legacy or EIP-2930 transaction
            // Populate missing gasPrice
            if (tx.gasPrice == null) {
              tx.gasPrice = this.getGasPrice();
            }
          } else {
            // We need to get fee data to determine things
            const feeData = yield this.getFeeData();

            if (tx.type == null) {
              // We need to auto-detect the intended type of this transaction...
              if (feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null) {
                // The network supports EIP-1559!
                // Upgrade transaction from null to eip-1559
                tx.type = 2;

                if (tx.gasPrice != null) {
                  // Using legacy gasPrice property on an eip-1559 network,
                  // so use gasPrice as both fee properties
                  const gasPrice = tx.gasPrice;
                  delete tx.gasPrice;
                  tx.maxFeePerGas = gasPrice;
                  tx.maxPriorityFeePerGas = gasPrice;
                } else {
                  // Populate missing fee data
                  if (tx.maxFeePerGas == null) {
                    tx.maxFeePerGas = feeData.maxFeePerGas;
                  }

                  if (tx.maxPriorityFeePerGas == null) {
                    tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                  }
                }
              } else if (feeData.gasPrice != null) {
                // Network doesn't support EIP-1559...
                // ...but they are trying to use EIP-1559 properties
                if (hasEip1559) {
                  logger$8.throwError("network does not support EIP-1559", Logger.errors.UNSUPPORTED_OPERATION, {
                    operation: "populateTransaction"
                  });
                } // Populate missing fee data


                if (tx.gasPrice == null) {
                  tx.gasPrice = feeData.gasPrice;
                } // Explicitly set untyped transaction to legacy


                tx.type = 0;
              } else {
                // getFeeData has failed us.
                logger$8.throwError("failed to get consistent fee data", Logger.errors.UNSUPPORTED_OPERATION, {
                  operation: "signer.getFeeData"
                });
              }
            } else if (tx.type === 2) {
              // Explicitly using EIP-1559
              // Populate missing fee data
              if (tx.maxFeePerGas == null) {
                tx.maxFeePerGas = feeData.maxFeePerGas;
              }

              if (tx.maxPriorityFeePerGas == null) {
                tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
              }
            }
          }

          if (tx.nonce == null) {
            tx.nonce = this.getTransactionCount("pending");
          }

          if (tx.gasLimit == null) {
            tx.gasLimit = this.estimateGas(tx).catch(error => {
              if (forwardErrors.indexOf(error.code) >= 0) {
                throw error;
              }

              return logger$8.throwError("cannot estimate gas; transaction may fail or may require manual gas limit", Logger.errors.UNPREDICTABLE_GAS_LIMIT, {
                error: error,
                tx: tx
              });
            });
          }

          if (tx.chainId == null) {
            tx.chainId = this.getChainId();
          } else {
            tx.chainId = Promise.all([Promise.resolve(tx.chainId), this.getChainId()]).then(results => {
              if (results[1] !== 0 && results[0] !== results[1]) {
                logger$8.throwArgumentError("chainId address mismatch", "transaction", transaction);
              }

              return results[0];
            });
          }

          return yield resolveProperties(tx);
        });
      } ///////////////////
      // Sub-classes SHOULD leave these alone


      _checkProvider(operation) {
        if (!this.provider) {
          logger$8.throwError("missing provider", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: operation || "_checkProvider"
          });
        }
      }

      static isSigner(value) {
        return !!(value && value._isSigner);
      }

    }

    function createCommonjsModule(fn, basedir, module) {
      return module = {
        path: basedir,
        exports: {},
        require: function (path, base) {
          return commonjsRequire(path, base === undefined || base === null ? module.path : base);
        }
      }, fn(module, module.exports), module.exports;
    }

    function commonjsRequire() {
      throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var minimalisticAssert = assert;

    function assert(val, msg) {
      if (!val) throw new Error(msg || 'Assertion failed');
    }

    assert.equal = function assertEqual(l, r, msg) {
      if (l != r) throw new Error(msg || 'Assertion failed: ' + l + ' != ' + r);
    };

    var utils_1 = createCommonjsModule(function (module, exports) {

      var utils = exports;

      function toArray(msg, enc) {
        if (Array.isArray(msg)) return msg.slice();
        if (!msg) return [];
        var res = [];

        if (typeof msg !== 'string') {
          for (var i = 0; i < msg.length; i++) res[i] = msg[i] | 0;

          return res;
        }

        if (enc === 'hex') {
          msg = msg.replace(/[^a-z0-9]+/ig, '');
          if (msg.length % 2 !== 0) msg = '0' + msg;

          for (var i = 0; i < msg.length; i += 2) res.push(parseInt(msg[i] + msg[i + 1], 16));
        } else {
          for (var i = 0; i < msg.length; i++) {
            var c = msg.charCodeAt(i);
            var hi = c >> 8;
            var lo = c & 0xff;
            if (hi) res.push(hi, lo);else res.push(lo);
          }
        }

        return res;
      }

      utils.toArray = toArray;

      function zero2(word) {
        if (word.length === 1) return '0' + word;else return word;
      }

      utils.zero2 = zero2;

      function toHex(msg) {
        var res = '';

        for (var i = 0; i < msg.length; i++) res += zero2(msg[i].toString(16));

        return res;
      }

      utils.toHex = toHex;

      utils.encode = function encode(arr, enc) {
        if (enc === 'hex') return toHex(arr);else return arr;
      };
    });
    var utils_1$1 = createCommonjsModule(function (module, exports) {

      var utils = exports;
      utils.assert = minimalisticAssert;
      utils.toArray = utils_1.toArray;
      utils.zero2 = utils_1.zero2;
      utils.toHex = utils_1.toHex;
      utils.encode = utils_1.encode; // Represent num in a w-NAF form

      function getNAF(num, w, bits) {
        var naf = new Array(Math.max(num.bitLength(), bits) + 1);
        naf.fill(0);
        var ws = 1 << w + 1;
        var k = num.clone();

        for (var i = 0; i < naf.length; i++) {
          var z;
          var mod = k.andln(ws - 1);

          if (k.isOdd()) {
            if (mod > (ws >> 1) - 1) z = (ws >> 1) - mod;else z = mod;
            k.isubn(z);
          } else {
            z = 0;
          }

          naf[i] = z;
          k.iushrn(1);
        }

        return naf;
      }

      utils.getNAF = getNAF; // Represent k1, k2 in a Joint Sparse Form

      function getJSF(k1, k2) {
        var jsf = [[], []];
        k1 = k1.clone();
        k2 = k2.clone();
        var d1 = 0;
        var d2 = 0;
        var m8;

        while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
          // First phase
          var m14 = k1.andln(3) + d1 & 3;
          var m24 = k2.andln(3) + d2 & 3;
          if (m14 === 3) m14 = -1;
          if (m24 === 3) m24 = -1;
          var u1;

          if ((m14 & 1) === 0) {
            u1 = 0;
          } else {
            m8 = k1.andln(7) + d1 & 7;
            if ((m8 === 3 || m8 === 5) && m24 === 2) u1 = -m14;else u1 = m14;
          }

          jsf[0].push(u1);
          var u2;

          if ((m24 & 1) === 0) {
            u2 = 0;
          } else {
            m8 = k2.andln(7) + d2 & 7;
            if ((m8 === 3 || m8 === 5) && m14 === 2) u2 = -m24;else u2 = m24;
          }

          jsf[1].push(u2); // Second phase

          if (2 * d1 === u1 + 1) d1 = 1 - d1;
          if (2 * d2 === u2 + 1) d2 = 1 - d2;
          k1.iushrn(1);
          k2.iushrn(1);
        }

        return jsf;
      }

      utils.getJSF = getJSF;

      function cachedProperty(obj, name, computer) {
        var key = '_' + name;

        obj.prototype[name] = function cachedProperty() {
          return this[key] !== undefined ? this[key] : this[key] = computer.call(this);
        };
      }

      utils.cachedProperty = cachedProperty;

      function parseBytes(bytes) {
        return typeof bytes === 'string' ? utils.toArray(bytes, 'hex') : bytes;
      }

      utils.parseBytes = parseBytes;

      function intFromLE(bytes) {
        return new BN__default["default"](bytes, 'hex', 'le');
      }

      utils.intFromLE = intFromLE;
    });

    var getNAF = utils_1$1.getNAF;
    var getJSF = utils_1$1.getJSF;
    var assert$1 = utils_1$1.assert;

    function BaseCurve(type, conf) {
      this.type = type;
      this.p = new BN__default["default"](conf.p, 16); // Use Montgomery, when there is no fast reduction for the prime

      this.red = conf.prime ? BN__default["default"].red(conf.prime) : BN__default["default"].mont(this.p); // Useful for many curves

      this.zero = new BN__default["default"](0).toRed(this.red);
      this.one = new BN__default["default"](1).toRed(this.red);
      this.two = new BN__default["default"](2).toRed(this.red); // Curve configuration, optional

      this.n = conf.n && new BN__default["default"](conf.n, 16);
      this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed); // Temporary arrays

      this._wnafT1 = new Array(4);
      this._wnafT2 = new Array(4);
      this._wnafT3 = new Array(4);
      this._wnafT4 = new Array(4);
      this._bitLength = this.n ? this.n.bitLength() : 0; // Generalized Greg Maxwell's trick

      var adjustCount = this.n && this.p.div(this.n);

      if (!adjustCount || adjustCount.cmpn(100) > 0) {
        this.redN = null;
      } else {
        this._maxwellTrick = true;
        this.redN = this.n.toRed(this.red);
      }
    }

    var base = BaseCurve;

    BaseCurve.prototype.point = function point() {
      throw new Error('Not implemented');
    };

    BaseCurve.prototype.validate = function validate() {
      throw new Error('Not implemented');
    };

    BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
      assert$1(p.precomputed);

      var doubles = p._getDoubles();

      var naf = getNAF(k, 1, this._bitLength);
      var I = (1 << doubles.step + 1) - (doubles.step % 2 === 0 ? 2 : 1);
      I /= 3; // Translate into more windowed form

      var repr = [];
      var j;
      var nafW;

      for (j = 0; j < naf.length; j += doubles.step) {
        nafW = 0;

        for (var l = j + doubles.step - 1; l >= j; l--) nafW = (nafW << 1) + naf[l];

        repr.push(nafW);
      }

      var a = this.jpoint(null, null, null);
      var b = this.jpoint(null, null, null);

      for (var i = I; i > 0; i--) {
        for (j = 0; j < repr.length; j++) {
          nafW = repr[j];
          if (nafW === i) b = b.mixedAdd(doubles.points[j]);else if (nafW === -i) b = b.mixedAdd(doubles.points[j].neg());
        }

        a = a.add(b);
      }

      return a.toP();
    };

    BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
      var w = 4; // Precompute window

      var nafPoints = p._getNAFPoints(w);

      w = nafPoints.wnd;
      var wnd = nafPoints.points; // Get NAF form

      var naf = getNAF(k, w, this._bitLength); // Add `this`*(N+1) for every w-NAF index

      var acc = this.jpoint(null, null, null);

      for (var i = naf.length - 1; i >= 0; i--) {
        // Count zeroes
        for (var l = 0; i >= 0 && naf[i] === 0; i--) l++;

        if (i >= 0) l++;
        acc = acc.dblp(l);
        if (i < 0) break;
        var z = naf[i];
        assert$1(z !== 0);

        if (p.type === 'affine') {
          // J +- P
          if (z > 0) acc = acc.mixedAdd(wnd[z - 1 >> 1]);else acc = acc.mixedAdd(wnd[-z - 1 >> 1].neg());
        } else {
          // J +- J
          if (z > 0) acc = acc.add(wnd[z - 1 >> 1]);else acc = acc.add(wnd[-z - 1 >> 1].neg());
        }
      }

      return p.type === 'affine' ? acc.toP() : acc;
    };

    BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW, points, coeffs, len, jacobianResult) {
      var wndWidth = this._wnafT1;
      var wnd = this._wnafT2;
      var naf = this._wnafT3; // Fill all arrays

      var max = 0;
      var i;
      var j;
      var p;

      for (i = 0; i < len; i++) {
        p = points[i];

        var nafPoints = p._getNAFPoints(defW);

        wndWidth[i] = nafPoints.wnd;
        wnd[i] = nafPoints.points;
      } // Comb small window NAFs


      for (i = len - 1; i >= 1; i -= 2) {
        var a = i - 1;
        var b = i;

        if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
          naf[a] = getNAF(coeffs[a], wndWidth[a], this._bitLength);
          naf[b] = getNAF(coeffs[b], wndWidth[b], this._bitLength);
          max = Math.max(naf[a].length, max);
          max = Math.max(naf[b].length, max);
          continue;
        }

        var comb = [points[a],
        /* 1 */
        null,
        /* 3 */
        null,
        /* 5 */
        points[b]
        /* 7 */
        ]; // Try to avoid Projective points, if possible

        if (points[a].y.cmp(points[b].y) === 0) {
          comb[1] = points[a].add(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].add(points[b].neg());
        } else {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        }

        var index = [-3,
        /* -1 -1 */
        -1,
        /* -1 0 */
        -5,
        /* -1 1 */
        -7,
        /* 0 -1 */
        0,
        /* 0 0 */
        7,
        /* 0 1 */
        5,
        /* 1 -1 */
        1,
        /* 1 0 */
        3
        /* 1 1 */
        ];
        var jsf = getJSF(coeffs[a], coeffs[b]);
        max = Math.max(jsf[0].length, max);
        naf[a] = new Array(max);
        naf[b] = new Array(max);

        for (j = 0; j < max; j++) {
          var ja = jsf[0][j] | 0;
          var jb = jsf[1][j] | 0;
          naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
          naf[b][j] = 0;
          wnd[a] = comb;
        }
      }

      var acc = this.jpoint(null, null, null);
      var tmp = this._wnafT4;

      for (i = max; i >= 0; i--) {
        var k = 0;

        while (i >= 0) {
          var zero = true;

          for (j = 0; j < len; j++) {
            tmp[j] = naf[j][i] | 0;
            if (tmp[j] !== 0) zero = false;
          }

          if (!zero) break;
          k++;
          i--;
        }

        if (i >= 0) k++;
        acc = acc.dblp(k);
        if (i < 0) break;

        for (j = 0; j < len; j++) {
          var z = tmp[j];
          if (z === 0) continue;else if (z > 0) p = wnd[j][z - 1 >> 1];else if (z < 0) p = wnd[j][-z - 1 >> 1].neg();
          if (p.type === 'affine') acc = acc.mixedAdd(p);else acc = acc.add(p);
        }
      } // Zeroify references


      for (i = 0; i < len; i++) wnd[i] = null;

      if (jacobianResult) return acc;else return acc.toP();
    };

    function BasePoint(curve, type) {
      this.curve = curve;
      this.type = type;
      this.precomputed = null;
    }

    BaseCurve.BasePoint = BasePoint;

    BasePoint.prototype.eq = function
      /*other*/
    eq() {
      throw new Error('Not implemented');
    };

    BasePoint.prototype.validate = function validate() {
      return this.curve.validate(this);
    };

    BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
      bytes = utils_1$1.toArray(bytes, enc);
      var len = this.p.byteLength(); // uncompressed, hybrid-odd, hybrid-even

      if ((bytes[0] === 0x04 || bytes[0] === 0x06 || bytes[0] === 0x07) && bytes.length - 1 === 2 * len) {
        if (bytes[0] === 0x06) assert$1(bytes[bytes.length - 1] % 2 === 0);else if (bytes[0] === 0x07) assert$1(bytes[bytes.length - 1] % 2 === 1);
        var res = this.point(bytes.slice(1, 1 + len), bytes.slice(1 + len, 1 + 2 * len));
        return res;
      } else if ((bytes[0] === 0x02 || bytes[0] === 0x03) && bytes.length - 1 === len) {
        return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 0x03);
      }

      throw new Error('Unknown point format');
    };

    BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
      return this.encode(enc, true);
    };

    BasePoint.prototype._encode = function _encode(compact) {
      var len = this.curve.p.byteLength();
      var x = this.getX().toArray('be', len);
      if (compact) return [this.getY().isEven() ? 0x02 : 0x03].concat(x);
      return [0x04].concat(x, this.getY().toArray('be', len));
    };

    BasePoint.prototype.encode = function encode(enc, compact) {
      return utils_1$1.encode(this._encode(compact), enc);
    };

    BasePoint.prototype.precompute = function precompute(power) {
      if (this.precomputed) return this;
      var precomputed = {
        doubles: null,
        naf: null,
        beta: null
      };
      precomputed.naf = this._getNAFPoints(8);
      precomputed.doubles = this._getDoubles(4, power);
      precomputed.beta = this._getBeta();
      this.precomputed = precomputed;
      return this;
    };

    BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
      if (!this.precomputed) return false;
      var doubles = this.precomputed.doubles;
      if (!doubles) return false;
      return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
    };

    BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
      if (this.precomputed && this.precomputed.doubles) return this.precomputed.doubles;
      var doubles = [this];
      var acc = this;

      for (var i = 0; i < power; i += step) {
        for (var j = 0; j < step; j++) acc = acc.dbl();

        doubles.push(acc);
      }

      return {
        step: step,
        points: doubles
      };
    };

    BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
      if (this.precomputed && this.precomputed.naf) return this.precomputed.naf;
      var res = [this];
      var max = (1 << wnd) - 1;
      var dbl = max === 1 ? null : this.dbl();

      for (var i = 1; i < max; i++) res[i] = res[i - 1].add(dbl);

      return {
        wnd: wnd,
        points: res
      };
    };

    BasePoint.prototype._getBeta = function _getBeta() {
      return null;
    };

    BasePoint.prototype.dblp = function dblp(k) {
      var r = this;

      for (var i = 0; i < k; i++) r = r.dbl();

      return r;
    };

    var inherits_browser = createCommonjsModule(function (module) {
      if (typeof Object.create === 'function') {
        // implementation from standard node.js 'util' module
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          }
        };
      } else {
        // old school shim for old browsers
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;

            var TempCtor = function () {};

            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          }
        };
      }
    });

    var assert$2 = utils_1$1.assert;

    function ShortCurve(conf) {
      base.call(this, 'short', conf);
      this.a = new BN__default["default"](conf.a, 16).toRed(this.red);
      this.b = new BN__default["default"](conf.b, 16).toRed(this.red);
      this.tinv = this.two.redInvm();
      this.zeroA = this.a.fromRed().cmpn(0) === 0;
      this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0; // If the curve is endomorphic, precalculate beta and lambda

      this.endo = this._getEndomorphism(conf);
      this._endoWnafT1 = new Array(4);
      this._endoWnafT2 = new Array(4);
    }

    inherits_browser(ShortCurve, base);
    var short_1 = ShortCurve;

    ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
      // No efficient endomorphism
      if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1) return; // Compute beta and lambda, that lambda * P = (beta * Px; Py)

      var beta;
      var lambda;

      if (conf.beta) {
        beta = new BN__default["default"](conf.beta, 16).toRed(this.red);
      } else {
        var betas = this._getEndoRoots(this.p); // Choose the smallest beta


        beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
        beta = beta.toRed(this.red);
      }

      if (conf.lambda) {
        lambda = new BN__default["default"](conf.lambda, 16);
      } else {
        // Choose the lambda that is matching selected beta
        var lambdas = this._getEndoRoots(this.n);

        if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
          lambda = lambdas[0];
        } else {
          lambda = lambdas[1];
          assert$2(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
        }
      } // Get basis vectors, used for balanced length-two representation


      var basis;

      if (conf.basis) {
        basis = conf.basis.map(function (vec) {
          return {
            a: new BN__default["default"](vec.a, 16),
            b: new BN__default["default"](vec.b, 16)
          };
        });
      } else {
        basis = this._getEndoBasis(lambda);
      }

      return {
        beta: beta,
        lambda: lambda,
        basis: basis
      };
    };

    ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
      // Find roots of for x^2 + x + 1 in F
      // Root = (-1 +- Sqrt(-3)) / 2
      //
      var red = num === this.p ? this.red : BN__default["default"].mont(num);
      var tinv = new BN__default["default"](2).toRed(red).redInvm();
      var ntinv = tinv.redNeg();
      var s = new BN__default["default"](3).toRed(red).redNeg().redSqrt().redMul(tinv);
      var l1 = ntinv.redAdd(s).fromRed();
      var l2 = ntinv.redSub(s).fromRed();
      return [l1, l2];
    };

    ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
      // aprxSqrt >= sqrt(this.n)
      var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2)); // 3.74
      // Run EGCD, until r(L + 1) < aprxSqrt

      var u = lambda;
      var v = this.n.clone();
      var x1 = new BN__default["default"](1);
      var y1 = new BN__default["default"](0);
      var x2 = new BN__default["default"](0);
      var y2 = new BN__default["default"](1); // NOTE: all vectors are roots of: a + b * lambda = 0 (mod n)

      var a0;
      var b0; // First vector

      var a1;
      var b1; // Second vector

      var a2;
      var b2;
      var prevR;
      var i = 0;
      var r;
      var x;

      while (u.cmpn(0) !== 0) {
        var q = v.div(u);
        r = v.sub(q.mul(u));
        x = x2.sub(q.mul(x1));
        var y = y2.sub(q.mul(y1));

        if (!a1 && r.cmp(aprxSqrt) < 0) {
          a0 = prevR.neg();
          b0 = x1;
          a1 = r.neg();
          b1 = x;
        } else if (a1 && ++i === 2) {
          break;
        }

        prevR = r;
        v = u;
        u = r;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
      }

      a2 = r.neg();
      b2 = x;
      var len1 = a1.sqr().add(b1.sqr());
      var len2 = a2.sqr().add(b2.sqr());

      if (len2.cmp(len1) >= 0) {
        a2 = a0;
        b2 = b0;
      } // Normalize signs


      if (a1.negative) {
        a1 = a1.neg();
        b1 = b1.neg();
      }

      if (a2.negative) {
        a2 = a2.neg();
        b2 = b2.neg();
      }

      return [{
        a: a1,
        b: b1
      }, {
        a: a2,
        b: b2
      }];
    };

    ShortCurve.prototype._endoSplit = function _endoSplit(k) {
      var basis = this.endo.basis;
      var v1 = basis[0];
      var v2 = basis[1];
      var c1 = v2.b.mul(k).divRound(this.n);
      var c2 = v1.b.neg().mul(k).divRound(this.n);
      var p1 = c1.mul(v1.a);
      var p2 = c2.mul(v2.a);
      var q1 = c1.mul(v1.b);
      var q2 = c2.mul(v2.b); // Calculate answer

      var k1 = k.sub(p1).sub(p2);
      var k2 = q1.add(q2).neg();
      return {
        k1: k1,
        k2: k2
      };
    };

    ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
      x = new BN__default["default"](x, 16);
      if (!x.red) x = x.toRed(this.red);
      var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
      var y = y2.redSqrt();
      if (y.redSqr().redSub(y2).cmp(this.zero) !== 0) throw new Error('invalid point'); // XXX Is there any way to tell if the number is odd without converting it
      // to non-red form?

      var isOdd = y.fromRed().isOdd();
      if (odd && !isOdd || !odd && isOdd) y = y.redNeg();
      return this.point(x, y);
    };

    ShortCurve.prototype.validate = function validate(point) {
      if (point.inf) return true;
      var x = point.x;
      var y = point.y;
      var ax = this.a.redMul(x);
      var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
      return y.redSqr().redISub(rhs).cmpn(0) === 0;
    };

    ShortCurve.prototype._endoWnafMulAdd = function _endoWnafMulAdd(points, coeffs, jacobianResult) {
      var npoints = this._endoWnafT1;
      var ncoeffs = this._endoWnafT2;

      for (var i = 0; i < points.length; i++) {
        var split = this._endoSplit(coeffs[i]);

        var p = points[i];

        var beta = p._getBeta();

        if (split.k1.negative) {
          split.k1.ineg();
          p = p.neg(true);
        }

        if (split.k2.negative) {
          split.k2.ineg();
          beta = beta.neg(true);
        }

        npoints[i * 2] = p;
        npoints[i * 2 + 1] = beta;
        ncoeffs[i * 2] = split.k1;
        ncoeffs[i * 2 + 1] = split.k2;
      }

      var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult); // Clean-up references to points and coefficients


      for (var j = 0; j < i * 2; j++) {
        npoints[j] = null;
        ncoeffs[j] = null;
      }

      return res;
    };

    function Point(curve, x, y, isRed) {
      base.BasePoint.call(this, curve, 'affine');

      if (x === null && y === null) {
        this.x = null;
        this.y = null;
        this.inf = true;
      } else {
        this.x = new BN__default["default"](x, 16);
        this.y = new BN__default["default"](y, 16); // Force redgomery representation when loading from JSON

        if (isRed) {
          this.x.forceRed(this.curve.red);
          this.y.forceRed(this.curve.red);
        }

        if (!this.x.red) this.x = this.x.toRed(this.curve.red);
        if (!this.y.red) this.y = this.y.toRed(this.curve.red);
        this.inf = false;
      }
    }

    inherits_browser(Point, base.BasePoint);

    ShortCurve.prototype.point = function point(x, y, isRed) {
      return new Point(this, x, y, isRed);
    };

    ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
      return Point.fromJSON(this, obj, red);
    };

    Point.prototype._getBeta = function _getBeta() {
      if (!this.curve.endo) return;
      var pre = this.precomputed;
      if (pre && pre.beta) return pre.beta;
      var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);

      if (pre) {
        var curve = this.curve;

        var endoMul = function (p) {
          return curve.point(p.x.redMul(curve.endo.beta), p.y);
        };

        pre.beta = beta;
        beta.precomputed = {
          beta: null,
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(endoMul)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(endoMul)
          }
        };
      }

      return beta;
    };

    Point.prototype.toJSON = function toJSON() {
      if (!this.precomputed) return [this.x, this.y];
      return [this.x, this.y, this.precomputed && {
        doubles: this.precomputed.doubles && {
          step: this.precomputed.doubles.step,
          points: this.precomputed.doubles.points.slice(1)
        },
        naf: this.precomputed.naf && {
          wnd: this.precomputed.naf.wnd,
          points: this.precomputed.naf.points.slice(1)
        }
      }];
    };

    Point.fromJSON = function fromJSON(curve, obj, red) {
      if (typeof obj === 'string') obj = JSON.parse(obj);
      var res = curve.point(obj[0], obj[1], red);
      if (!obj[2]) return res;

      function obj2point(obj) {
        return curve.point(obj[0], obj[1], red);
      }

      var pre = obj[2];
      res.precomputed = {
        beta: null,
        doubles: pre.doubles && {
          step: pre.doubles.step,
          points: [res].concat(pre.doubles.points.map(obj2point))
        },
        naf: pre.naf && {
          wnd: pre.naf.wnd,
          points: [res].concat(pre.naf.points.map(obj2point))
        }
      };
      return res;
    };

    Point.prototype.inspect = function inspect() {
      if (this.isInfinity()) return '<EC Point Infinity>';
      return '<EC Point x: ' + this.x.fromRed().toString(16, 2) + ' y: ' + this.y.fromRed().toString(16, 2) + '>';
    };

    Point.prototype.isInfinity = function isInfinity() {
      return this.inf;
    };

    Point.prototype.add = function add(p) {
      // O + P = P
      if (this.inf) return p; // P + O = P

      if (p.inf) return this; // P + P = 2P

      if (this.eq(p)) return this.dbl(); // P + (-P) = O

      if (this.neg().eq(p)) return this.curve.point(null, null); // P + Q = O

      if (this.x.cmp(p.x) === 0) return this.curve.point(null, null);
      var c = this.y.redSub(p.y);
      if (c.cmpn(0) !== 0) c = c.redMul(this.x.redSub(p.x).redInvm());
      var nx = c.redSqr().redISub(this.x).redISub(p.x);
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };

    Point.prototype.dbl = function dbl() {
      if (this.inf) return this; // 2P = O

      var ys1 = this.y.redAdd(this.y);
      if (ys1.cmpn(0) === 0) return this.curve.point(null, null);
      var a = this.curve.a;
      var x2 = this.x.redSqr();
      var dyinv = ys1.redInvm();
      var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);
      var nx = c.redSqr().redISub(this.x.redAdd(this.x));
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };

    Point.prototype.getX = function getX() {
      return this.x.fromRed();
    };

    Point.prototype.getY = function getY() {
      return this.y.fromRed();
    };

    Point.prototype.mul = function mul(k) {
      k = new BN__default["default"](k, 16);
      if (this.isInfinity()) return this;else if (this._hasDoubles(k)) return this.curve._fixedNafMul(this, k);else if (this.curve.endo) return this.curve._endoWnafMulAdd([this], [k]);else return this.curve._wnafMul(this, k);
    };

    Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
      var points = [this, p2];
      var coeffs = [k1, k2];
      if (this.curve.endo) return this.curve._endoWnafMulAdd(points, coeffs);else return this.curve._wnafMulAdd(1, points, coeffs, 2);
    };

    Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
      var points = [this, p2];
      var coeffs = [k1, k2];
      if (this.curve.endo) return this.curve._endoWnafMulAdd(points, coeffs, true);else return this.curve._wnafMulAdd(1, points, coeffs, 2, true);
    };

    Point.prototype.eq = function eq(p) {
      return this === p || this.inf === p.inf && (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0);
    };

    Point.prototype.neg = function neg(_precompute) {
      if (this.inf) return this;
      var res = this.curve.point(this.x, this.y.redNeg());

      if (_precompute && this.precomputed) {
        var pre = this.precomputed;

        var negate = function (p) {
          return p.neg();
        };

        res.precomputed = {
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(negate)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(negate)
          }
        };
      }

      return res;
    };

    Point.prototype.toJ = function toJ() {
      if (this.inf) return this.curve.jpoint(null, null, null);
      var res = this.curve.jpoint(this.x, this.y, this.curve.one);
      return res;
    };

    function JPoint(curve, x, y, z) {
      base.BasePoint.call(this, curve, 'jacobian');

      if (x === null && y === null && z === null) {
        this.x = this.curve.one;
        this.y = this.curve.one;
        this.z = new BN__default["default"](0);
      } else {
        this.x = new BN__default["default"](x, 16);
        this.y = new BN__default["default"](y, 16);
        this.z = new BN__default["default"](z, 16);
      }

      if (!this.x.red) this.x = this.x.toRed(this.curve.red);
      if (!this.y.red) this.y = this.y.toRed(this.curve.red);
      if (!this.z.red) this.z = this.z.toRed(this.curve.red);
      this.zOne = this.z === this.curve.one;
    }

    inherits_browser(JPoint, base.BasePoint);

    ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
      return new JPoint(this, x, y, z);
    };

    JPoint.prototype.toP = function toP() {
      if (this.isInfinity()) return this.curve.point(null, null);
      var zinv = this.z.redInvm();
      var zinv2 = zinv.redSqr();
      var ax = this.x.redMul(zinv2);
      var ay = this.y.redMul(zinv2).redMul(zinv);
      return this.curve.point(ax, ay);
    };

    JPoint.prototype.neg = function neg() {
      return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
    };

    JPoint.prototype.add = function add(p) {
      // O + P = P
      if (this.isInfinity()) return p; // P + O = P

      if (p.isInfinity()) return this; // 12M + 4S + 7A

      var pz2 = p.z.redSqr();
      var z2 = this.z.redSqr();
      var u1 = this.x.redMul(pz2);
      var u2 = p.x.redMul(z2);
      var s1 = this.y.redMul(pz2.redMul(p.z));
      var s2 = p.y.redMul(z2.redMul(this.z));
      var h = u1.redSub(u2);
      var r = s1.redSub(s2);

      if (h.cmpn(0) === 0) {
        if (r.cmpn(0) !== 0) return this.curve.jpoint(null, null, null);else return this.dbl();
      }

      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);
      var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(p.z).redMul(h);
      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.mixedAdd = function mixedAdd(p) {
      // O + P = P
      if (this.isInfinity()) return p.toJ(); // P + O = P

      if (p.isInfinity()) return this; // 8M + 3S + 7A

      var z2 = this.z.redSqr();
      var u1 = this.x;
      var u2 = p.x.redMul(z2);
      var s1 = this.y;
      var s2 = p.y.redMul(z2).redMul(this.z);
      var h = u1.redSub(u2);
      var r = s1.redSub(s2);

      if (h.cmpn(0) === 0) {
        if (r.cmpn(0) !== 0) return this.curve.jpoint(null, null, null);else return this.dbl();
      }

      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);
      var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(h);
      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.dblp = function dblp(pow) {
      if (pow === 0) return this;
      if (this.isInfinity()) return this;
      if (!pow) return this.dbl();
      var i;

      if (this.curve.zeroA || this.curve.threeA) {
        var r = this;

        for (i = 0; i < pow; i++) r = r.dbl();

        return r;
      } // 1M + 2S + 1A + N * (4S + 5M + 8A)
      // N = 1 => 6M + 6S + 9A


      var a = this.curve.a;
      var tinv = this.curve.tinv;
      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr(); // Reuse results

      var jyd = jy.redAdd(jy);

      for (i = 0; i < pow; i++) {
        var jx2 = jx.redSqr();
        var jyd2 = jyd.redSqr();
        var jyd4 = jyd2.redSqr();
        var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
        var t1 = jx.redMul(jyd2);
        var nx = c.redSqr().redISub(t1.redAdd(t1));
        var t2 = t1.redISub(nx);
        var dny = c.redMul(t2);
        dny = dny.redIAdd(dny).redISub(jyd4);
        var nz = jyd.redMul(jz);
        if (i + 1 < pow) jz4 = jz4.redMul(jyd4);
        jx = nx;
        jz = nz;
        jyd = dny;
      }

      return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
    };

    JPoint.prototype.dbl = function dbl() {
      if (this.isInfinity()) return this;
      if (this.curve.zeroA) return this._zeroDbl();else if (this.curve.threeA) return this._threeDbl();else return this._dbl();
    };

    JPoint.prototype._zeroDbl = function _zeroDbl() {
      var nx;
      var ny;
      var nz; // Z = 1

      if (this.zOne) {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
        //     #doubling-mdbl-2007-bl
        // 1M + 5S + 14A
        // XX = X1^2
        var xx = this.x.redSqr(); // YY = Y1^2

        var yy = this.y.redSqr(); // YYYY = YY^2

        var yyyy = yy.redSqr(); // S = 2 * ((X1 + YY)^2 - XX - YYYY)

        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s); // M = 3 * XX + a; a = 0

        var m = xx.redAdd(xx).redIAdd(xx); // T = M ^ 2 - 2*S

        var t = m.redSqr().redISub(s).redISub(s); // 8 * YYYY

        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8); // X3 = T

        nx = t; // Y3 = M * (S - T) - 8 * YYYY

        ny = m.redMul(s.redISub(t)).redISub(yyyy8); // Z3 = 2*Y1

        nz = this.y.redAdd(this.y);
      } else {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
        //     #doubling-dbl-2009-l
        // 2M + 5S + 13A
        // A = X1^2
        var a = this.x.redSqr(); // B = Y1^2

        var b = this.y.redSqr(); // C = B^2

        var c = b.redSqr(); // D = 2 * ((X1 + B)^2 - A - C)

        var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
        d = d.redIAdd(d); // E = 3 * A

        var e = a.redAdd(a).redIAdd(a); // F = E^2

        var f = e.redSqr(); // 8 * C

        var c8 = c.redIAdd(c);
        c8 = c8.redIAdd(c8);
        c8 = c8.redIAdd(c8); // X3 = F - 2 * D

        nx = f.redISub(d).redISub(d); // Y3 = E * (D - X3) - 8 * C

        ny = e.redMul(d.redISub(nx)).redISub(c8); // Z3 = 2 * Y1 * Z1

        nz = this.y.redMul(this.z);
        nz = nz.redIAdd(nz);
      }

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype._threeDbl = function _threeDbl() {
      var nx;
      var ny;
      var nz; // Z = 1

      if (this.zOne) {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html
        //     #doubling-mdbl-2007-bl
        // 1M + 5S + 15A
        // XX = X1^2
        var xx = this.x.redSqr(); // YY = Y1^2

        var yy = this.y.redSqr(); // YYYY = YY^2

        var yyyy = yy.redSqr(); // S = 2 * ((X1 + YY)^2 - XX - YYYY)

        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s); // M = 3 * XX + a

        var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a); // T = M^2 - 2 * S

        var t = m.redSqr().redISub(s).redISub(s); // X3 = T

        nx = t; // Y3 = M * (S - T) - 8 * YYYY

        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        ny = m.redMul(s.redISub(t)).redISub(yyyy8); // Z3 = 2 * Y1

        nz = this.y.redAdd(this.y);
      } else {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
        // 3M + 5S
        // delta = Z1^2
        var delta = this.z.redSqr(); // gamma = Y1^2

        var gamma = this.y.redSqr(); // beta = X1 * gamma

        var beta = this.x.redMul(gamma); // alpha = 3 * (X1 - delta) * (X1 + delta)

        var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
        alpha = alpha.redAdd(alpha).redIAdd(alpha); // X3 = alpha^2 - 8 * beta

        var beta4 = beta.redIAdd(beta);
        beta4 = beta4.redIAdd(beta4);
        var beta8 = beta4.redAdd(beta4);
        nx = alpha.redSqr().redISub(beta8); // Z3 = (Y1 + Z1)^2 - gamma - delta

        nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta); // Y3 = alpha * (4 * beta - X3) - 8 * gamma^2

        var ggamma8 = gamma.redSqr();
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
      }

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype._dbl = function _dbl() {
      var a = this.curve.a; // 4M + 6S + 10A

      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr();
      var jx2 = jx.redSqr();
      var jy2 = jy.redSqr();
      var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
      var jxd4 = jx.redAdd(jx);
      jxd4 = jxd4.redIAdd(jxd4);
      var t1 = jxd4.redMul(jy2);
      var nx = c.redSqr().redISub(t1.redAdd(t1));
      var t2 = t1.redISub(nx);
      var jyd8 = jy2.redSqr();
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      var ny = c.redMul(t2).redISub(jyd8);
      var nz = jy.redAdd(jy).redMul(jz);
      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.trpl = function trpl() {
      if (!this.curve.zeroA) return this.dbl().add(this); // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#tripling-tpl-2007-bl
      // 5M + 10S + ...
      // XX = X1^2

      var xx = this.x.redSqr(); // YY = Y1^2

      var yy = this.y.redSqr(); // ZZ = Z1^2

      var zz = this.z.redSqr(); // YYYY = YY^2

      var yyyy = yy.redSqr(); // M = 3 * XX + a * ZZ2; a = 0

      var m = xx.redAdd(xx).redIAdd(xx); // MM = M^2

      var mm = m.redSqr(); // E = 6 * ((X1 + YY)^2 - XX - YYYY) - MM

      var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
      e = e.redIAdd(e);
      e = e.redAdd(e).redIAdd(e);
      e = e.redISub(mm); // EE = E^2

      var ee = e.redSqr(); // T = 16*YYYY

      var t = yyyy.redIAdd(yyyy);
      t = t.redIAdd(t);
      t = t.redIAdd(t);
      t = t.redIAdd(t); // U = (M + E)^2 - MM - EE - T

      var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t); // X3 = 4 * (X1 * EE - 4 * YY * U)

      var yyu4 = yy.redMul(u);
      yyu4 = yyu4.redIAdd(yyu4);
      yyu4 = yyu4.redIAdd(yyu4);
      var nx = this.x.redMul(ee).redISub(yyu4);
      nx = nx.redIAdd(nx);
      nx = nx.redIAdd(nx); // Y3 = 8 * Y1 * (U * (T - U) - E * EE)

      var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny); // Z3 = (Z1 + E)^2 - ZZ - EE

      var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);
      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.mul = function mul(k, kbase) {
      k = new BN__default["default"](k, kbase);
      return this.curve._wnafMul(this, k);
    };

    JPoint.prototype.eq = function eq(p) {
      if (p.type === 'affine') return this.eq(p.toJ());
      if (this === p) return true; // x1 * z2^2 == x2 * z1^2

      var z2 = this.z.redSqr();
      var pz2 = p.z.redSqr();
      if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0) return false; // y1 * z2^3 == y2 * z1^3

      var z3 = z2.redMul(this.z);
      var pz3 = pz2.redMul(p.z);
      return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
    };

    JPoint.prototype.eqXToP = function eqXToP(x) {
      var zs = this.z.redSqr();
      var rx = x.toRed(this.curve.red).redMul(zs);
      if (this.x.cmp(rx) === 0) return true;
      var xc = x.clone();
      var t = this.curve.redN.redMul(zs);

      for (;;) {
        xc.iadd(this.curve.n);
        if (xc.cmp(this.curve.p) >= 0) return false;
        rx.redIAdd(t);
        if (this.x.cmp(rx) === 0) return true;
      }
    };

    JPoint.prototype.inspect = function inspect() {
      if (this.isInfinity()) return '<EC JPoint Infinity>';
      return '<EC JPoint x: ' + this.x.toString(16, 2) + ' y: ' + this.y.toString(16, 2) + ' z: ' + this.z.toString(16, 2) + '>';
    };

    JPoint.prototype.isInfinity = function isInfinity() {
      // XXX This code assumes that zero is always zero in red
      return this.z.cmpn(0) === 0;
    };

    var curve_1 = createCommonjsModule(function (module, exports) {

      var curve = exports;
      curve.base = base;
      curve.short = short_1;
      curve.mont =
      /*RicMoo:ethers:require(./mont)*/
      null;
      curve.edwards =
      /*RicMoo:ethers:require(./edwards)*/
      null;
    });
    var curves_1 = createCommonjsModule(function (module, exports) {

      var curves = exports;
      var assert = utils_1$1.assert;

      function PresetCurve(options) {
        if (options.type === 'short') this.curve = new curve_1.short(options);else if (options.type === 'edwards') this.curve = new curve_1.edwards(options);else this.curve = new curve_1.mont(options);
        this.g = this.curve.g;
        this.n = this.curve.n;
        this.hash = options.hash;
        assert(this.g.validate(), 'Invalid curve');
        assert(this.g.mul(this.n).isInfinity(), 'Invalid curve, G*N != O');
      }

      curves.PresetCurve = PresetCurve;

      function defineCurve(name, options) {
        Object.defineProperty(curves, name, {
          configurable: true,
          enumerable: true,
          get: function () {
            var curve = new PresetCurve(options);
            Object.defineProperty(curves, name, {
              configurable: true,
              enumerable: true,
              value: curve
            });
            return curve;
          }
        });
      }

      defineCurve('p192', {
        type: 'short',
        prime: 'p192',
        p: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff',
        a: 'ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc',
        b: '64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1',
        n: 'ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831',
        hash: hash__default["default"].sha256,
        gRed: false,
        g: ['188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012', '07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811']
      });
      defineCurve('p224', {
        type: 'short',
        prime: 'p224',
        p: 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001',
        a: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe',
        b: 'b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4',
        n: 'ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d',
        hash: hash__default["default"].sha256,
        gRed: false,
        g: ['b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21', 'bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34']
      });
      defineCurve('p256', {
        type: 'short',
        prime: null,
        p: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff',
        a: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc',
        b: '5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b',
        n: 'ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551',
        hash: hash__default["default"].sha256,
        gRed: false,
        g: ['6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296', '4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5']
      });
      defineCurve('p384', {
        type: 'short',
        prime: null,
        p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'fffffffe ffffffff 00000000 00000000 ffffffff',
        a: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'fffffffe ffffffff 00000000 00000000 fffffffc',
        b: 'b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f ' + '5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef',
        n: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 ' + 'f4372ddf 581a0db2 48b0a77a ecec196a ccc52973',
        hash: hash__default["default"].sha384,
        gRed: false,
        g: ['aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 ' + '5502f25d bf55296c 3a545e38 72760ab7', '3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 ' + '0a60b1ce 1d7e819d 7a431d7c 90ea0e5f']
      });
      defineCurve('p521', {
        type: 'short',
        prime: null,
        p: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff ffffffff',
        a: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff ffffffff ffffffff fffffffc',
        b: '00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b ' + '99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd ' + '3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00',
        n: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' + 'ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 ' + 'f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409',
        hash: hash__default["default"].sha512,
        gRed: false,
        g: ['000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 ' + '053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 ' + 'a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66', '00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 ' + '579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 ' + '3fad0761 353c7086 a272c240 88be9476 9fd16650']
      });
      defineCurve('curve25519', {
        type: 'mont',
        prime: 'p25519',
        p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
        a: '76d06',
        b: '1',
        n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
        hash: hash__default["default"].sha256,
        gRed: false,
        g: ['9']
      });
      defineCurve('ed25519', {
        type: 'edwards',
        prime: 'p25519',
        p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
        a: '-1',
        c: '1',
        // -121665 * (121666^(-1)) (mod P)
        d: '52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3',
        n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
        hash: hash__default["default"].sha256,
        gRed: false,
        g: ['216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a', // 4/5
        '6666666666666666666666666666666666666666666666666666666666666658']
      });
      var pre;

      try {
        pre =
        /*RicMoo:ethers:require(./precomputed/secp256k1)*/
        null.crash();
      } catch (e) {
        pre = undefined;
      }

      defineCurve('secp256k1', {
        type: 'short',
        prime: 'k256',
        p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f',
        a: '0',
        b: '7',
        n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
        h: '1',
        hash: hash__default["default"].sha256,
        // Precomputed endomorphism
        beta: '7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee',
        lambda: '5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72',
        basis: [{
          a: '3086d221a7d46bcde86c90e49284eb15',
          b: '-e4437ed6010e88286f547fa90abfe4c3'
        }, {
          a: '114ca50f7a8e2f3f657c1108d9d44cfd8',
          b: '3086d221a7d46bcde86c90e49284eb15'
        }],
        gRed: false,
        g: ['79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8', pre]
      });
    });

    function HmacDRBG(options) {
      if (!(this instanceof HmacDRBG)) return new HmacDRBG(options);
      this.hash = options.hash;
      this.predResist = !!options.predResist;
      this.outLen = this.hash.outSize;
      this.minEntropy = options.minEntropy || this.hash.hmacStrength;
      this._reseed = null;
      this.reseedInterval = null;
      this.K = null;
      this.V = null;
      var entropy = utils_1.toArray(options.entropy, options.entropyEnc || 'hex');
      var nonce = utils_1.toArray(options.nonce, options.nonceEnc || 'hex');
      var pers = utils_1.toArray(options.pers, options.persEnc || 'hex');
      minimalisticAssert(entropy.length >= this.minEntropy / 8, 'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

      this._init(entropy, nonce, pers);
    }

    var hmacDrbg = HmacDRBG;

    HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
      var seed = entropy.concat(nonce).concat(pers);
      this.K = new Array(this.outLen / 8);
      this.V = new Array(this.outLen / 8);

      for (var i = 0; i < this.V.length; i++) {
        this.K[i] = 0x00;
        this.V[i] = 0x01;
      }

      this._update(seed);

      this._reseed = 1;
      this.reseedInterval = 0x1000000000000; // 2^48
    };

    HmacDRBG.prototype._hmac = function hmac() {
      return new hash__default["default"].hmac(this.hash, this.K);
    };

    HmacDRBG.prototype._update = function update(seed) {
      var kmac = this._hmac().update(this.V).update([0x00]);

      if (seed) kmac = kmac.update(seed);
      this.K = kmac.digest();
      this.V = this._hmac().update(this.V).digest();
      if (!seed) return;
      this.K = this._hmac().update(this.V).update([0x01]).update(seed).digest();
      this.V = this._hmac().update(this.V).digest();
    };

    HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
      // Optional entropy enc
      if (typeof entropyEnc !== 'string') {
        addEnc = add;
        add = entropyEnc;
        entropyEnc = null;
      }

      entropy = utils_1.toArray(entropy, entropyEnc);
      add = utils_1.toArray(add, addEnc);
      minimalisticAssert(entropy.length >= this.minEntropy / 8, 'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

      this._update(entropy.concat(add || []));

      this._reseed = 1;
    };

    HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
      if (this._reseed > this.reseedInterval) throw new Error('Reseed is required'); // Optional encoding

      if (typeof enc !== 'string') {
        addEnc = add;
        add = enc;
        enc = null;
      } // Optional additional data


      if (add) {
        add = utils_1.toArray(add, addEnc || 'hex');

        this._update(add);
      }

      var temp = [];

      while (temp.length < len) {
        this.V = this._hmac().update(this.V).digest();
        temp = temp.concat(this.V);
      }

      var res = temp.slice(0, len);

      this._update(add);

      this._reseed++;
      return utils_1.encode(res, enc);
    };

    var assert$3 = utils_1$1.assert;

    function KeyPair(ec, options) {
      this.ec = ec;
      this.priv = null;
      this.pub = null; // KeyPair(ec, { priv: ..., pub: ... })

      if (options.priv) this._importPrivate(options.priv, options.privEnc);
      if (options.pub) this._importPublic(options.pub, options.pubEnc);
    }

    var key = KeyPair;

    KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
      if (pub instanceof KeyPair) return pub;
      return new KeyPair(ec, {
        pub: pub,
        pubEnc: enc
      });
    };

    KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
      if (priv instanceof KeyPair) return priv;
      return new KeyPair(ec, {
        priv: priv,
        privEnc: enc
      });
    };

    KeyPair.prototype.validate = function validate() {
      var pub = this.getPublic();
      if (pub.isInfinity()) return {
        result: false,
        reason: 'Invalid public key'
      };
      if (!pub.validate()) return {
        result: false,
        reason: 'Public key is not a point'
      };
      if (!pub.mul(this.ec.curve.n).isInfinity()) return {
        result: false,
        reason: 'Public key * N != O'
      };
      return {
        result: true,
        reason: null
      };
    };

    KeyPair.prototype.getPublic = function getPublic(compact, enc) {
      // compact is optional argument
      if (typeof compact === 'string') {
        enc = compact;
        compact = null;
      }

      if (!this.pub) this.pub = this.ec.g.mul(this.priv);
      if (!enc) return this.pub;
      return this.pub.encode(enc, compact);
    };

    KeyPair.prototype.getPrivate = function getPrivate(enc) {
      if (enc === 'hex') return this.priv.toString(16, 2);else return this.priv;
    };

    KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
      this.priv = new BN__default["default"](key, enc || 16); // Ensure that the priv won't be bigger than n, otherwise we may fail
      // in fixed multiplication method

      this.priv = this.priv.umod(this.ec.curve.n);
    };

    KeyPair.prototype._importPublic = function _importPublic(key, enc) {
      if (key.x || key.y) {
        // Montgomery points only have an `x` coordinate.
        // Weierstrass/Edwards points on the other hand have both `x` and
        // `y` coordinates.
        if (this.ec.curve.type === 'mont') {
          assert$3(key.x, 'Need x coordinate');
        } else if (this.ec.curve.type === 'short' || this.ec.curve.type === 'edwards') {
          assert$3(key.x && key.y, 'Need both x and y coordinate');
        }

        this.pub = this.ec.curve.point(key.x, key.y);
        return;
      }

      this.pub = this.ec.curve.decodePoint(key, enc);
    }; // ECDH


    KeyPair.prototype.derive = function derive(pub) {
      if (!pub.validate()) {
        assert$3(pub.validate(), 'public point not validated');
      }

      return pub.mul(this.priv).getX();
    }; // ECDSA


    KeyPair.prototype.sign = function sign(msg, enc, options) {
      return this.ec.sign(msg, this, enc, options);
    };

    KeyPair.prototype.verify = function verify(msg, signature) {
      return this.ec.verify(msg, signature, this);
    };

    KeyPair.prototype.inspect = function inspect() {
      return '<Key priv: ' + (this.priv && this.priv.toString(16, 2)) + ' pub: ' + (this.pub && this.pub.inspect()) + ' >';
    };

    var assert$4 = utils_1$1.assert;

    function Signature(options, enc) {
      if (options instanceof Signature) return options;
      if (this._importDER(options, enc)) return;
      assert$4(options.r && options.s, 'Signature without r or s');
      this.r = new BN__default["default"](options.r, 16);
      this.s = new BN__default["default"](options.s, 16);
      if (options.recoveryParam === undefined) this.recoveryParam = null;else this.recoveryParam = options.recoveryParam;
    }

    var signature = Signature;

    function Position() {
      this.place = 0;
    }

    function getLength(buf, p) {
      var initial = buf[p.place++];

      if (!(initial & 0x80)) {
        return initial;
      }

      var octetLen = initial & 0xf; // Indefinite length or overflow

      if (octetLen === 0 || octetLen > 4) {
        return false;
      }

      var val = 0;

      for (var i = 0, off = p.place; i < octetLen; i++, off++) {
        val <<= 8;
        val |= buf[off];
        val >>>= 0;
      } // Leading zeroes


      if (val <= 0x7f) {
        return false;
      }

      p.place = off;
      return val;
    }

    function rmPadding(buf) {
      var i = 0;
      var len = buf.length - 1;

      while (!buf[i] && !(buf[i + 1] & 0x80) && i < len) {
        i++;
      }

      if (i === 0) {
        return buf;
      }

      return buf.slice(i);
    }

    Signature.prototype._importDER = function _importDER(data, enc) {
      data = utils_1$1.toArray(data, enc);
      var p = new Position();

      if (data[p.place++] !== 0x30) {
        return false;
      }

      var len = getLength(data, p);

      if (len === false) {
        return false;
      }

      if (len + p.place !== data.length) {
        return false;
      }

      if (data[p.place++] !== 0x02) {
        return false;
      }

      var rlen = getLength(data, p);

      if (rlen === false) {
        return false;
      }

      var r = data.slice(p.place, rlen + p.place);
      p.place += rlen;

      if (data[p.place++] !== 0x02) {
        return false;
      }

      var slen = getLength(data, p);

      if (slen === false) {
        return false;
      }

      if (data.length !== slen + p.place) {
        return false;
      }

      var s = data.slice(p.place, slen + p.place);

      if (r[0] === 0) {
        if (r[1] & 0x80) {
          r = r.slice(1);
        } else {
          // Leading zeroes
          return false;
        }
      }

      if (s[0] === 0) {
        if (s[1] & 0x80) {
          s = s.slice(1);
        } else {
          // Leading zeroes
          return false;
        }
      }

      this.r = new BN__default["default"](r);
      this.s = new BN__default["default"](s);
      this.recoveryParam = null;
      return true;
    };

    function constructLength(arr, len) {
      if (len < 0x80) {
        arr.push(len);
        return;
      }

      var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
      arr.push(octets | 0x80);

      while (--octets) {
        arr.push(len >>> (octets << 3) & 0xff);
      }

      arr.push(len);
    }

    Signature.prototype.toDER = function toDER(enc) {
      var r = this.r.toArray();
      var s = this.s.toArray(); // Pad values

      if (r[0] & 0x80) r = [0].concat(r); // Pad values

      if (s[0] & 0x80) s = [0].concat(s);
      r = rmPadding(r);
      s = rmPadding(s);

      while (!s[0] && !(s[1] & 0x80)) {
        s = s.slice(1);
      }

      var arr = [0x02];
      constructLength(arr, r.length);
      arr = arr.concat(r);
      arr.push(0x02);
      constructLength(arr, s.length);
      var backHalf = arr.concat(s);
      var res = [0x30];
      constructLength(res, backHalf.length);
      res = res.concat(backHalf);
      return utils_1$1.encode(res, enc);
    };

    var rand =
    /*RicMoo:ethers:require(brorand)*/
    function () {
      throw new Error('unsupported');
    };

    var assert$5 = utils_1$1.assert;

    function EC(options) {
      if (!(this instanceof EC)) return new EC(options); // Shortcut `elliptic.ec(curve-name)`

      if (typeof options === 'string') {
        assert$5(Object.prototype.hasOwnProperty.call(curves_1, options), 'Unknown curve ' + options);
        options = curves_1[options];
      } // Shortcut for `elliptic.ec(elliptic.curves.curveName)`


      if (options instanceof curves_1.PresetCurve) options = {
        curve: options
      };
      this.curve = options.curve.curve;
      this.n = this.curve.n;
      this.nh = this.n.ushrn(1);
      this.g = this.curve.g; // Point on curve

      this.g = options.curve.g;
      this.g.precompute(options.curve.n.bitLength() + 1); // Hash for function for DRBG

      this.hash = options.hash || options.curve.hash;
    }

    var ec = EC;

    EC.prototype.keyPair = function keyPair(options) {
      return new key(this, options);
    };

    EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
      return key.fromPrivate(this, priv, enc);
    };

    EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
      return key.fromPublic(this, pub, enc);
    };

    EC.prototype.genKeyPair = function genKeyPair(options) {
      if (!options) options = {}; // Instantiate Hmac_DRBG

      var drbg = new hmacDrbg({
        hash: this.hash,
        pers: options.pers,
        persEnc: options.persEnc || 'utf8',
        entropy: options.entropy || rand(this.hash.hmacStrength),
        entropyEnc: options.entropy && options.entropyEnc || 'utf8',
        nonce: this.n.toArray()
      });
      var bytes = this.n.byteLength();
      var ns2 = this.n.sub(new BN__default["default"](2));

      for (;;) {
        var priv = new BN__default["default"](drbg.generate(bytes));
        if (priv.cmp(ns2) > 0) continue;
        priv.iaddn(1);
        return this.keyFromPrivate(priv);
      }
    };

    EC.prototype._truncateToN = function _truncateToN(msg, truncOnly) {
      var delta = msg.byteLength() * 8 - this.n.bitLength();
      if (delta > 0) msg = msg.ushrn(delta);
      if (!truncOnly && msg.cmp(this.n) >= 0) return msg.sub(this.n);else return msg;
    };

    EC.prototype.sign = function sign(msg, key, enc, options) {
      if (typeof enc === 'object') {
        options = enc;
        enc = null;
      }

      if (!options) options = {};
      key = this.keyFromPrivate(key, enc);
      msg = this._truncateToN(new BN__default["default"](msg, 16)); // Zero-extend key to provide enough entropy

      var bytes = this.n.byteLength();
      var bkey = key.getPrivate().toArray('be', bytes); // Zero-extend nonce to have the same byte size as N

      var nonce = msg.toArray('be', bytes); // Instantiate Hmac_DRBG

      var drbg = new hmacDrbg({
        hash: this.hash,
        entropy: bkey,
        nonce: nonce,
        pers: options.pers,
        persEnc: options.persEnc || 'utf8'
      }); // Number of bytes to generate

      var ns1 = this.n.sub(new BN__default["default"](1));

      for (var iter = 0;; iter++) {
        var k = options.k ? options.k(iter) : new BN__default["default"](drbg.generate(this.n.byteLength()));
        k = this._truncateToN(k, true);
        if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0) continue;
        var kp = this.g.mul(k);
        if (kp.isInfinity()) continue;
        var kpX = kp.getX();
        var r = kpX.umod(this.n);
        if (r.cmpn(0) === 0) continue;
        var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
        s = s.umod(this.n);
        if (s.cmpn(0) === 0) continue;
        var recoveryParam = (kp.getY().isOdd() ? 1 : 0) | (kpX.cmp(r) !== 0 ? 2 : 0); // Use complement of `s`, if it is > `n / 2`

        if (options.canonical && s.cmp(this.nh) > 0) {
          s = this.n.sub(s);
          recoveryParam ^= 1;
        }

        return new signature({
          r: r,
          s: s,
          recoveryParam: recoveryParam
        });
      }
    };

    EC.prototype.verify = function verify(msg, signature$1, key, enc) {
      msg = this._truncateToN(new BN__default["default"](msg, 16));
      key = this.keyFromPublic(key, enc);
      signature$1 = new signature(signature$1, 'hex'); // Perform primitive values validation

      var r = signature$1.r;
      var s = signature$1.s;
      if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0) return false;
      if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0) return false; // Validate signature

      var sinv = s.invm(this.n);
      var u1 = sinv.mul(msg).umod(this.n);
      var u2 = sinv.mul(r).umod(this.n);
      var p;

      if (!this.curve._maxwellTrick) {
        p = this.g.mulAdd(u1, key.getPublic(), u2);
        if (p.isInfinity()) return false;
        return p.getX().umod(this.n).cmp(r) === 0;
      } // NOTE: Greg Maxwell's trick, inspired by:
      // https://git.io/vad3K


      p = this.g.jmulAdd(u1, key.getPublic(), u2);
      if (p.isInfinity()) return false; // Compare `p.x` of Jacobian point with `r`,
      // this will do `p.x == r * p.z^2` instead of multiplying `p.x` by the
      // inverse of `p.z^2`

      return p.eqXToP(r);
    };

    EC.prototype.recoverPubKey = function (msg, signature$1, j, enc) {
      assert$5((3 & j) === j, 'The recovery param is more than two bits');
      signature$1 = new signature(signature$1, enc);
      var n = this.n;
      var e = new BN__default["default"](msg);
      var r = signature$1.r;
      var s = signature$1.s; // A set LSB signifies that the y-coordinate is odd

      var isYOdd = j & 1;
      var isSecondKey = j >> 1;
      if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey) throw new Error('Unable to find sencond key candinate'); // 1.1. Let x = r + jn.

      if (isSecondKey) r = this.curve.pointFromX(r.add(this.curve.n), isYOdd);else r = this.curve.pointFromX(r, isYOdd);
      var rInv = signature$1.r.invm(n);
      var s1 = n.sub(e).mul(rInv).umod(n);
      var s2 = s.mul(rInv).umod(n); // 1.6.1 Compute Q = r^-1 (sR -  eG)
      //               Q = r^-1 (sR + -eG)

      return this.g.mulAdd(s1, r, s2);
    };

    EC.prototype.getKeyRecoveryParam = function (e, signature$1, Q, enc) {
      signature$1 = new signature(signature$1, enc);
      if (signature$1.recoveryParam !== null) return signature$1.recoveryParam;

      for (var i = 0; i < 4; i++) {
        var Qprime;

        try {
          Qprime = this.recoverPubKey(e, signature$1, i);
        } catch (e) {
          continue;
        }

        if (Qprime.eq(Q)) return i;
      }

      throw new Error('Unable to find valid recovery factor');
    };

    var elliptic_1 = createCommonjsModule(function (module, exports) {

      var elliptic = exports;
      elliptic.version =
      /*RicMoo:ethers*/
      {
        version: "6.5.4"
      }.version;
      elliptic.utils = utils_1$1;

      elliptic.rand =
      /*RicMoo:ethers:require(brorand)*/
      function () {
        throw new Error('unsupported');
      };

      elliptic.curve = curve_1;
      elliptic.curves = curves_1; // Protocols

      elliptic.ec = ec;
      elliptic.eddsa =
      /*RicMoo:ethers:require(./elliptic/eddsa)*/
      null;
    });
    var EC$1 = elliptic_1.ec;

    const version$5 = "signing-key/5.6.2";

    const logger$7 = new Logger(version$5);
    let _curve = null;

    function getCurve() {
      if (!_curve) {
        _curve = new EC$1("secp256k1");
      }

      return _curve;
    }

    class SigningKey {
      constructor(privateKey) {
        defineReadOnly(this, "curve", "secp256k1");
        defineReadOnly(this, "privateKey", hexlify(privateKey));

        if (hexDataLength(this.privateKey) !== 32) {
          logger$7.throwArgumentError("invalid private key", "privateKey", "[[ REDACTED ]]");
        }

        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        defineReadOnly(this, "publicKey", "0x" + keyPair.getPublic(false, "hex"));
        defineReadOnly(this, "compressedPublicKey", "0x" + keyPair.getPublic(true, "hex"));
        defineReadOnly(this, "_isSigningKey", true);
      }

      _addPoint(other) {
        const p0 = getCurve().keyFromPublic(arrayify(this.publicKey));
        const p1 = getCurve().keyFromPublic(arrayify(other));
        return "0x" + p0.pub.add(p1.pub).encodeCompressed("hex");
      }

      signDigest(digest) {
        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const digestBytes = arrayify(digest);

        if (digestBytes.length !== 32) {
          logger$7.throwArgumentError("bad digest length", "digest", digest);
        }

        const signature = keyPair.sign(digestBytes, {
          canonical: true
        });
        return splitSignature({
          recoveryParam: signature.recoveryParam,
          r: hexZeroPad("0x" + signature.r.toString(16), 32),
          s: hexZeroPad("0x" + signature.s.toString(16), 32)
        });
      }

      computeSharedSecret(otherKey) {
        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const otherKeyPair = getCurve().keyFromPublic(arrayify(computePublicKey(otherKey)));
        return hexZeroPad("0x" + keyPair.derive(otherKeyPair.getPublic()).toString(16), 32);
      }

      static isSigningKey(value) {
        return !!(value && value._isSigningKey);
      }

    }
    function recoverPublicKey(digest, signature) {
      const sig = splitSignature(signature);
      const rs = {
        r: arrayify(sig.r),
        s: arrayify(sig.s)
      };
      return "0x" + getCurve().recoverPubKey(arrayify(digest), rs, sig.recoveryParam).encode("hex", false);
    }
    function computePublicKey(key, compressed) {
      const bytes = arrayify(key);

      if (bytes.length === 32) {
        const signingKey = new SigningKey(bytes);

        if (compressed) {
          return "0x" + getCurve().keyFromPrivate(bytes).getPublic(true, "hex");
        }

        return signingKey.publicKey;
      } else if (bytes.length === 33) {
        if (compressed) {
          return hexlify(bytes);
        }

        return "0x" + getCurve().keyFromPublic(bytes).getPublic(false, "hex");
      } else if (bytes.length === 65) {
        if (!compressed) {
          return hexlify(bytes);
        }

        return "0x" + getCurve().keyFromPublic(bytes).getPublic(true, "hex");
      }

      return logger$7.throwArgumentError("invalid public or private key", "key", "[REDACTED]");
    }

    const version$4 = "transactions/5.6.2";

    const logger$6 = new Logger(version$4);
    var TransactionTypes;

    (function (TransactionTypes) {
      TransactionTypes[TransactionTypes["legacy"] = 0] = "legacy";
      TransactionTypes[TransactionTypes["eip2930"] = 1] = "eip2930";
      TransactionTypes[TransactionTypes["eip1559"] = 2] = "eip1559";
    })(TransactionTypes || (TransactionTypes = {}));

    function handleAddress(value) {
      if (value === "0x") {
        return null;
      }

      return getAddress(value);
    }

    function handleNumber(value) {
      if (value === "0x") {
        return Zero$1;
      }

      return BigNumber.from(value);
    } // Legacy Transaction Fields
    function computeAddress(key) {
      const publicKey = computePublicKey(key);
      return getAddress(hexDataSlice(keccak256(hexDataSlice(publicKey, 1)), 12));
    }
    function recoverAddress(digest, signature) {
      return computeAddress(recoverPublicKey(arrayify(digest), signature));
    }

    function formatNumber(value, name) {
      const result = stripZeros(BigNumber.from(value).toHexString());

      if (result.length > 32) {
        logger$6.throwArgumentError("invalid length for " + name, "transaction:" + name, value);
      }

      return result;
    }

    function accessSetify(addr, storageKeys) {
      return {
        address: getAddress(addr),
        storageKeys: (storageKeys || []).map((storageKey, index) => {
          if (hexDataLength(storageKey) !== 32) {
            logger$6.throwArgumentError("invalid access list storageKey", `accessList[${addr}:${index}]`, storageKey);
          }

          return storageKey.toLowerCase();
        })
      };
    }

    function accessListify(value) {
      if (Array.isArray(value)) {
        return value.map((set, index) => {
          if (Array.isArray(set)) {
            if (set.length > 2) {
              logger$6.throwArgumentError("access list expected to be [ address, storageKeys[] ]", `value[${index}]`, set);
            }

            return accessSetify(set[0], set[1]);
          }

          return accessSetify(set.address, set.storageKeys);
        });
      }

      const result = Object.keys(value).map(addr => {
        const storageKeys = value[addr].reduce((accum, storageKey) => {
          accum[storageKey] = true;
          return accum;
        }, {});
        return accessSetify(addr, Object.keys(storageKeys).sort());
      });
      result.sort((a, b) => a.address.localeCompare(b.address));
      return result;
    }

    function formatAccessList(value) {
      return accessListify(value).map(set => [set.address, set.storageKeys]);
    }

    function _serializeEip1559(transaction, signature) {
      // If there is an explicit gasPrice, make sure it matches the
      // EIP-1559 fees; otherwise they may not understand what they
      // think they are setting in terms of fee.
      if (transaction.gasPrice != null) {
        const gasPrice = BigNumber.from(transaction.gasPrice);
        const maxFeePerGas = BigNumber.from(transaction.maxFeePerGas || 0);

        if (!gasPrice.eq(maxFeePerGas)) {
          logger$6.throwArgumentError("mismatch EIP-1559 gasPrice != maxFeePerGas", "tx", {
            gasPrice,
            maxFeePerGas
          });
        }
      }

      const fields = [formatNumber(transaction.chainId || 0, "chainId"), formatNumber(transaction.nonce || 0, "nonce"), formatNumber(transaction.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"), formatNumber(transaction.maxFeePerGas || 0, "maxFeePerGas"), formatNumber(transaction.gasLimit || 0, "gasLimit"), transaction.to != null ? getAddress(transaction.to) : "0x", formatNumber(transaction.value || 0, "value"), transaction.data || "0x", formatAccessList(transaction.accessList || [])];

      if (signature) {
        const sig = splitSignature(signature);
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
        fields.push(stripZeros(sig.r));
        fields.push(stripZeros(sig.s));
      }

      return hexConcat(["0x02", encode$1(fields)]);
    }

    function _serializeEip2930(transaction, signature) {
      const fields = [formatNumber(transaction.chainId || 0, "chainId"), formatNumber(transaction.nonce || 0, "nonce"), formatNumber(transaction.gasPrice || 0, "gasPrice"), formatNumber(transaction.gasLimit || 0, "gasLimit"), transaction.to != null ? getAddress(transaction.to) : "0x", formatNumber(transaction.value || 0, "value"), transaction.data || "0x", formatAccessList(transaction.accessList || [])];

      if (signature) {
        const sig = splitSignature(signature);
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
        fields.push(stripZeros(sig.r));
        fields.push(stripZeros(sig.s));
      }

      return hexConcat(["0x01", encode$1(fields)]);
    } // Legacy Transactions and EIP-155

    function _parseEipSignature(tx, fields, serialize) {
      try {
        const recid = handleNumber(fields[0]).toNumber();

        if (recid !== 0 && recid !== 1) {
          throw new Error("bad recid");
        }

        tx.v = recid;
      } catch (error) {
        logger$6.throwArgumentError("invalid v for transaction type: 1", "v", fields[0]);
      }

      tx.r = hexZeroPad(fields[1], 32);
      tx.s = hexZeroPad(fields[2], 32);

      try {
        const digest = keccak256(serialize(tx));
        tx.from = recoverAddress(digest, {
          r: tx.r,
          s: tx.s,
          recoveryParam: tx.v
        });
      } catch (error) {}
    }

    function _parseEip1559(payload) {
      const transaction = decode$1(payload.slice(1));

      if (transaction.length !== 9 && transaction.length !== 12) {
        logger$6.throwArgumentError("invalid component count for transaction type: 2", "payload", hexlify(payload));
      }

      const maxPriorityFeePerGas = handleNumber(transaction[2]);
      const maxFeePerGas = handleNumber(transaction[3]);
      const tx = {
        type: 2,
        chainId: handleNumber(transaction[0]).toNumber(),
        nonce: handleNumber(transaction[1]).toNumber(),
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        maxFeePerGas: maxFeePerGas,
        gasPrice: null,
        gasLimit: handleNumber(transaction[4]),
        to: handleAddress(transaction[5]),
        value: handleNumber(transaction[6]),
        data: transaction[7],
        accessList: accessListify(transaction[8])
      }; // Unsigned EIP-1559 Transaction

      if (transaction.length === 9) {
        return tx;
      }

      tx.hash = keccak256(payload);

      _parseEipSignature(tx, transaction.slice(9), _serializeEip1559);

      return tx;
    }

    function _parseEip2930(payload) {
      const transaction = decode$1(payload.slice(1));

      if (transaction.length !== 8 && transaction.length !== 11) {
        logger$6.throwArgumentError("invalid component count for transaction type: 1", "payload", hexlify(payload));
      }

      const tx = {
        type: 1,
        chainId: handleNumber(transaction[0]).toNumber(),
        nonce: handleNumber(transaction[1]).toNumber(),
        gasPrice: handleNumber(transaction[2]),
        gasLimit: handleNumber(transaction[3]),
        to: handleAddress(transaction[4]),
        value: handleNumber(transaction[5]),
        data: transaction[6],
        accessList: accessListify(transaction[7])
      }; // Unsigned EIP-2930 Transaction

      if (transaction.length === 8) {
        return tx;
      }

      tx.hash = keccak256(payload);

      _parseEipSignature(tx, transaction.slice(8), _serializeEip2930);

      return tx;
    } // Legacy Transactions and EIP-155


    function _parse(rawTransaction) {
      const transaction = decode$1(rawTransaction);

      if (transaction.length !== 9 && transaction.length !== 6) {
        logger$6.throwArgumentError("invalid raw transaction", "rawTransaction", rawTransaction);
      }

      const tx = {
        nonce: handleNumber(transaction[0]).toNumber(),
        gasPrice: handleNumber(transaction[1]),
        gasLimit: handleNumber(transaction[2]),
        to: handleAddress(transaction[3]),
        value: handleNumber(transaction[4]),
        data: transaction[5],
        chainId: 0
      }; // Legacy unsigned transaction

      if (transaction.length === 6) {
        return tx;
      }

      try {
        tx.v = BigNumber.from(transaction[6]).toNumber();
      } catch (error) {
        // @TODO: What makes snese to do? The v is too big
        return tx;
      }

      tx.r = hexZeroPad(transaction[7], 32);
      tx.s = hexZeroPad(transaction[8], 32);

      if (BigNumber.from(tx.r).isZero() && BigNumber.from(tx.s).isZero()) {
        // EIP-155 unsigned transaction
        tx.chainId = tx.v;
        tx.v = 0;
      } else {
        // Signed Transaction
        tx.chainId = Math.floor((tx.v - 35) / 2);

        if (tx.chainId < 0) {
          tx.chainId = 0;
        }

        let recoveryParam = tx.v - 27;
        const raw = transaction.slice(0, 6);

        if (tx.chainId !== 0) {
          raw.push(hexlify(tx.chainId));
          raw.push("0x");
          raw.push("0x");
          recoveryParam -= tx.chainId * 2 + 8;
        }

        const digest = keccak256(encode$1(raw));

        try {
          tx.from = recoverAddress(digest, {
            r: hexlify(tx.r),
            s: hexlify(tx.s),
            recoveryParam: recoveryParam
          });
        } catch (error) {}

        tx.hash = keccak256(rawTransaction);
      }

      tx.type = null;
      return tx;
    }

    function parse(rawTransaction) {
      const payload = arrayify(rawTransaction); // Legacy and EIP-155 Transactions

      if (payload[0] > 0x7f) {
        return _parse(payload);
      } // Typed Transaction (EIP-2718)


      switch (payload[0]) {
        case 1:
          return _parseEip2930(payload);

        case 2:
          return _parseEip1559(payload);
      }

      return logger$6.throwError(`unsupported transaction type: ${payload[0]}`, Logger.errors.UNSUPPORTED_OPERATION, {
        operation: "parseTransaction",
        transactionType: payload[0]
      });
    }

    /**
     * var basex = require("base-x");
     *
     * This implementation is heavily based on base-x. The main reason to
     * deviate was to prevent the dependency of Buffer.
     *
     * Contributors:
     *
     * base-x encoding
     * Forked from https://github.com/cryptocoinjs/bs58
     * Originally written by Mike Hearn for BitcoinJ
     * Copyright (c) 2011 Google Inc
     * Ported to JavaScript by Stefan Thomas
     * Merged Buffer refactorings from base58-native by Stephen Pair
     * Copyright (c) 2013 BitPay Inc
     *
     * The MIT License (MIT)
     *
     * Copyright base-x contributors (c) 2016
     *
     * Permission is hereby granted, free of charge, to any person obtaining a
     * copy of this software and associated documentation files (the "Software"),
     * to deal in the Software without restriction, including without limitation
     * the rights to use, copy, modify, merge, publish, distribute, sublicense,
     * and/or sell copies of the Software, and to permit persons to whom the
     * Software is furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in
     * all copies or substantial portions of the Software.

     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
     * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
     * IN THE SOFTWARE.
     *
     */
    class BaseX {
      constructor(alphabet) {
        defineReadOnly(this, "alphabet", alphabet);
        defineReadOnly(this, "base", alphabet.length);
        defineReadOnly(this, "_alphabetMap", {});
        defineReadOnly(this, "_leader", alphabet.charAt(0)); // pre-compute lookup table

        for (let i = 0; i < alphabet.length; i++) {
          this._alphabetMap[alphabet.charAt(i)] = i;
        }
      }

      encode(value) {
        let source = arrayify(value);

        if (source.length === 0) {
          return "";
        }

        let digits = [0];

        for (let i = 0; i < source.length; ++i) {
          let carry = source[i];

          for (let j = 0; j < digits.length; ++j) {
            carry += digits[j] << 8;
            digits[j] = carry % this.base;
            carry = carry / this.base | 0;
          }

          while (carry > 0) {
            digits.push(carry % this.base);
            carry = carry / this.base | 0;
          }
        }

        let string = ""; // deal with leading zeros

        for (let k = 0; source[k] === 0 && k < source.length - 1; ++k) {
          string += this._leader;
        } // convert digits to a string


        for (let q = digits.length - 1; q >= 0; --q) {
          string += this.alphabet[digits[q]];
        }

        return string;
      }

      decode(value) {
        if (typeof value !== "string") {
          throw new TypeError("Expected String");
        }

        let bytes = [];

        if (value.length === 0) {
          return new Uint8Array(bytes);
        }

        bytes.push(0);

        for (let i = 0; i < value.length; i++) {
          let byte = this._alphabetMap[value[i]];

          if (byte === undefined) {
            throw new Error("Non-base" + this.base + " character");
          }

          let carry = byte;

          for (let j = 0; j < bytes.length; ++j) {
            carry += bytes[j] * this.base;
            bytes[j] = carry & 0xff;
            carry >>= 8;
          }

          while (carry > 0) {
            bytes.push(carry & 0xff);
            carry >>= 8;
          }
        } // deal with leading zeros


        for (let k = 0; value[k] === this._leader && k < value.length - 1; ++k) {
          bytes.push(0);
        }

        return arrayify(new Uint8Array(bytes.reverse()));
      }

    }
    new BaseX("abcdefghijklmnopqrstuvwxyz234567");
    const Base58 = new BaseX("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
    //console.log(Base58.encode(Base58.decode("Qmd2V777o5XvJbYMeMb8k2nU5f8d3ciUQ5YpYuWhzv8iDj")))

    const version$3 = "sha2/5.6.1";

    new Logger(version$3);
    function sha256(data) {
      return "0x" + hash__default["default"].sha256().update(arrayify(data)).digest("hex");
    }

    const version$2 = "networks/5.6.4";

    const logger$5 = new Logger(version$2);

    function isRenetworkable(value) {
      return value && typeof value.renetwork === "function";
    }

    function ethDefaultProvider(network) {
      const func = function (providers, options) {
        if (options == null) {
          options = {};
        }

        const providerList = [];

        if (providers.InfuraProvider && options.infura !== "-") {
          try {
            providerList.push(new providers.InfuraProvider(network, options.infura));
          } catch (error) {}
        }

        if (providers.EtherscanProvider && options.etherscan !== "-") {
          try {
            providerList.push(new providers.EtherscanProvider(network, options.etherscan));
          } catch (error) {}
        }

        if (providers.AlchemyProvider && options.alchemy !== "-") {
          try {
            providerList.push(new providers.AlchemyProvider(network, options.alchemy));
          } catch (error) {}
        }

        if (providers.PocketProvider && options.pocket !== "-") {
          // These networks are currently faulty on Pocket as their
          // network does not handle the Berlin hardfork, which is
          // live on these ones.
          // @TODO: This goes away once Pocket has upgraded their nodes
          const skip = ["goerli", "ropsten", "rinkeby"];

          try {
            const provider = new providers.PocketProvider(network, options.pocket);

            if (provider.network && skip.indexOf(provider.network.name) === -1) {
              providerList.push(provider);
            }
          } catch (error) {}
        }

        if (providers.CloudflareProvider && options.cloudflare !== "-") {
          try {
            providerList.push(new providers.CloudflareProvider(network));
          } catch (error) {}
        }

        if (providers.AnkrProvider && options.ankr !== "-") {
          try {
            const skip = ["ropsten"];
            const provider = new providers.AnkrProvider(network, options.ankr);

            if (provider.network && skip.indexOf(provider.network.name) === -1) {
              providerList.push(provider);
            }
          } catch (error) {}
        }

        if (providerList.length === 0) {
          return null;
        }

        if (providers.FallbackProvider) {
          let quorum = 1;

          if (options.quorum != null) {
            quorum = options.quorum;
          } else if (network === "homestead") {
            quorum = 2;
          }

          return new providers.FallbackProvider(providerList, quorum);
        }

        return providerList[0];
      };

      func.renetwork = function (network) {
        return ethDefaultProvider(network);
      };

      return func;
    }

    function etcDefaultProvider(url, network) {
      const func = function (providers, options) {
        if (providers.JsonRpcProvider) {
          return new providers.JsonRpcProvider(url, network);
        }

        return null;
      };

      func.renetwork = function (network) {
        return etcDefaultProvider(url, network);
      };

      return func;
    }

    const homestead = {
      chainId: 1,
      ensAddress: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      name: "homestead",
      _defaultProvider: ethDefaultProvider("homestead")
    };
    const ropsten = {
      chainId: 3,
      ensAddress: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      name: "ropsten",
      _defaultProvider: ethDefaultProvider("ropsten")
    };
    const classicMordor = {
      chainId: 63,
      name: "classicMordor",
      _defaultProvider: etcDefaultProvider("https://www.ethercluster.com/mordor", "classicMordor")
    }; // See: https://chainlist.org

    const networks = {
      unspecified: {
        chainId: 0,
        name: "unspecified"
      },
      homestead: homestead,
      mainnet: homestead,
      morden: {
        chainId: 2,
        name: "morden"
      },
      ropsten: ropsten,
      testnet: ropsten,
      rinkeby: {
        chainId: 4,
        ensAddress: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
        name: "rinkeby",
        _defaultProvider: ethDefaultProvider("rinkeby")
      },
      kovan: {
        chainId: 42,
        name: "kovan",
        _defaultProvider: ethDefaultProvider("kovan")
      },
      goerli: {
        chainId: 5,
        ensAddress: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
        name: "goerli",
        _defaultProvider: ethDefaultProvider("goerli")
      },
      kintsugi: {
        chainId: 1337702,
        name: "kintsugi"
      },
      // ETC (See: #351)
      classic: {
        chainId: 61,
        name: "classic",
        _defaultProvider: etcDefaultProvider("https:/\/www.ethercluster.com/etc", "classic")
      },
      classicMorden: {
        chainId: 62,
        name: "classicMorden"
      },
      classicMordor: classicMordor,
      classicTestnet: classicMordor,
      classicKotti: {
        chainId: 6,
        name: "classicKotti",
        _defaultProvider: etcDefaultProvider("https:/\/www.ethercluster.com/kotti", "classicKotti")
      },
      xdai: {
        chainId: 100,
        name: "xdai"
      },
      matic: {
        chainId: 137,
        name: "matic",
        _defaultProvider: ethDefaultProvider("matic")
      },
      maticmum: {
        chainId: 80001,
        name: "maticmum"
      },
      optimism: {
        chainId: 10,
        name: "optimism",
        _defaultProvider: ethDefaultProvider("optimism")
      },
      "optimism-kovan": {
        chainId: 69,
        name: "optimism-kovan"
      },
      "optimism-goerli": {
        chainId: 420,
        name: "optimism-goerli"
      },
      arbitrum: {
        chainId: 42161,
        name: "arbitrum"
      },
      "arbitrum-rinkeby": {
        chainId: 421611,
        name: "arbitrum-rinkeby"
      },
      bnb: {
        chainId: 56,
        name: "bnb"
      },
      bnbt: {
        chainId: 97,
        name: "bnbt"
      }
    };
    /**
     *  getNetwork
     *
     *  Converts a named common networks or chain ID (network ID) to a Network
     *  and verifies a network is a valid Network..
     */

    function getNetwork(network) {
      // No network (null)
      if (network == null) {
        return null;
      }

      if (typeof network === "number") {
        for (const name in networks) {
          const standard = networks[name];

          if (standard.chainId === network) {
            return {
              name: standard.name,
              chainId: standard.chainId,
              ensAddress: standard.ensAddress || null,
              _defaultProvider: standard._defaultProvider || null
            };
          }
        }

        return {
          chainId: network,
          name: "unknown"
        };
      }

      if (typeof network === "string") {
        const standard = networks[network];

        if (standard == null) {
          return null;
        }

        return {
          name: standard.name,
          chainId: standard.chainId,
          ensAddress: standard.ensAddress,
          _defaultProvider: standard._defaultProvider || null
        };
      }

      const standard = networks[network.name]; // Not a standard network; check that it is a valid network in general

      if (!standard) {
        if (typeof network.chainId !== "number") {
          logger$5.throwArgumentError("invalid network chainId", "network", network);
        }

        return network;
      } // Make sure the chainId matches the expected network chainId (or is 0; disable EIP-155)


      if (network.chainId !== 0 && network.chainId !== standard.chainId) {
        logger$5.throwArgumentError("network chainId mismatch", "network", network);
      } // @TODO: In the next major version add an attach function to a defaultProvider
      // class and move the _defaultProvider internal to this file (extend Network)


      let defaultProvider = network._defaultProvider || null;

      if (defaultProvider == null && standard._defaultProvider) {
        if (isRenetworkable(standard._defaultProvider)) {
          defaultProvider = standard._defaultProvider.renetwork(network);
        } else {
          defaultProvider = standard._defaultProvider;
        }
      } // Standard Network (allow overriding the ENS address)


      return {
        name: network.name,
        chainId: standard.chainId,
        ensAddress: network.ensAddress || standard.ensAddress || null,
        _defaultProvider: defaultProvider
      };
    }

    function decode(textData) {
      textData = atob(textData);
      const data = [];

      for (let i = 0; i < textData.length; i++) {
        data.push(textData.charCodeAt(i));
      }

      return arrayify(data);
    }
    function encode(data) {
      data = arrayify(data);
      let textData = "";

      for (let i = 0; i < data.length; i++) {
        textData += String.fromCharCode(data[i]);
      }

      return btoa(textData);
    }

    const version$1 = "web/5.6.1";

    var __awaiter$3 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    function getUrl(href, options) {
      return __awaiter$3(this, void 0, void 0, function* () {
        if (options == null) {
          options = {};
        }

        const request = {
          method: options.method || "GET",
          headers: options.headers || {},
          body: options.body || undefined
        };

        if (options.skipFetchSetup !== true) {
          request.mode = "cors"; // no-cors, cors, *same-origin

          request.cache = "no-cache"; // *default, no-cache, reload, force-cache, only-if-cached

          request.credentials = "same-origin"; // include, *same-origin, omit

          request.redirect = "follow"; // manual, *follow, error

          request.referrer = "client"; // no-referrer, *client
        }
        const response = yield fetch(href, request);
        const body = yield response.arrayBuffer();
        const headers = {};

        if (response.headers.forEach) {
          response.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
          });
        } else {
          response.headers.keys().forEach(key => {
            headers[key.toLowerCase()] = response.headers.get(key);
          });
        }

        return {
          headers: headers,
          statusCode: response.status,
          statusMessage: response.statusText,
          body: arrayify(new Uint8Array(body))
        };
      });
    }

    var __awaiter$2 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    const logger$4 = new Logger(version$1);

    function staller(duration) {
      return new Promise(resolve => {
        setTimeout(resolve, duration);
      });
    }

    function bodyify(value, type) {
      if (value == null) {
        return null;
      }

      if (typeof value === "string") {
        return value;
      }

      if (isBytesLike(value)) {
        if (type && (type.split("/")[0] === "text" || type.split(";")[0].trim() === "application/json")) {
          try {
            return toUtf8String(value);
          } catch (error) {}
        }

        return hexlify(value);
      }

      return value;
    } // This API is still a work in progress; the future changes will likely be:
    // - ConnectionInfo => FetchDataRequest<T = any>
    // - FetchDataRequest.body? = string | Uint8Array | { contentType: string, data: string | Uint8Array }
    //   - If string => text/plain, Uint8Array => application/octet-stream (if content-type unspecified)
    // - FetchDataRequest.processFunc = (body: Uint8Array, response: FetchDataResponse) => T
    // For this reason, it should be considered internal until the API is finalized


    function _fetchData(connection, body, processFunc) {
      // How many times to retry in the event of a throttle
      const attemptLimit = typeof connection === "object" && connection.throttleLimit != null ? connection.throttleLimit : 12;
      logger$4.assertArgument(attemptLimit > 0 && attemptLimit % 1 === 0, "invalid connection throttle limit", "connection.throttleLimit", attemptLimit);
      const throttleCallback = typeof connection === "object" ? connection.throttleCallback : null;
      const throttleSlotInterval = typeof connection === "object" && typeof connection.throttleSlotInterval === "number" ? connection.throttleSlotInterval : 100;
      logger$4.assertArgument(throttleSlotInterval > 0 && throttleSlotInterval % 1 === 0, "invalid connection throttle slot interval", "connection.throttleSlotInterval", throttleSlotInterval);
      const errorPassThrough = typeof connection === "object" ? !!connection.errorPassThrough : false;
      const headers = {};
      let url = null; // @TODO: Allow ConnectionInfo to override some of these values

      const options = {
        method: "GET"
      };
      let allow304 = false;
      let timeout = 2 * 60 * 1000;

      if (typeof connection === "string") {
        url = connection;
      } else if (typeof connection === "object") {
        if (connection == null || connection.url == null) {
          logger$4.throwArgumentError("missing URL", "connection.url", connection);
        }

        url = connection.url;

        if (typeof connection.timeout === "number" && connection.timeout > 0) {
          timeout = connection.timeout;
        }

        if (connection.headers) {
          for (const key in connection.headers) {
            headers[key.toLowerCase()] = {
              key: key,
              value: String(connection.headers[key])
            };

            if (["if-none-match", "if-modified-since"].indexOf(key.toLowerCase()) >= 0) {
              allow304 = true;
            }
          }
        }

        options.allowGzip = !!connection.allowGzip;

        if (connection.user != null && connection.password != null) {
          if (url.substring(0, 6) !== "https:" && connection.allowInsecureAuthentication !== true) {
            logger$4.throwError("basic authentication requires a secure https url", Logger.errors.INVALID_ARGUMENT, {
              argument: "url",
              url: url,
              user: connection.user,
              password: "[REDACTED]"
            });
          }

          const authorization = connection.user + ":" + connection.password;
          headers["authorization"] = {
            key: "Authorization",
            value: "Basic " + encode(toUtf8Bytes(authorization))
          };
        }

        if (connection.skipFetchSetup != null) {
          options.skipFetchSetup = !!connection.skipFetchSetup;
        }
      }

      const reData = new RegExp("^data:([a-z0-9-]+/[a-z0-9-]+);base64,(.*)$", "i");
      const dataMatch = url ? url.match(reData) : null;

      if (dataMatch) {
        try {
          const response = {
            statusCode: 200,
            statusMessage: "OK",
            headers: {
              "content-type": dataMatch[1]
            },
            body: decode(dataMatch[2])
          };
          let result = response.body;

          if (processFunc) {
            result = processFunc(response.body, response);
          }

          return Promise.resolve(result);
        } catch (error) {
          logger$4.throwError("processing response error", Logger.errors.SERVER_ERROR, {
            body: bodyify(dataMatch[1], dataMatch[2]),
            error: error,
            requestBody: null,
            requestMethod: "GET",
            url: url
          });
        }
      }

      if (body) {
        options.method = "POST";
        options.body = body;

        if (headers["content-type"] == null) {
          headers["content-type"] = {
            key: "Content-Type",
            value: "application/octet-stream"
          };
        }

        if (headers["content-length"] == null) {
          headers["content-length"] = {
            key: "Content-Length",
            value: String(body.length)
          };
        }
      }

      const flatHeaders = {};
      Object.keys(headers).forEach(key => {
        const header = headers[key];
        flatHeaders[header.key] = header.value;
      });
      options.headers = flatHeaders;

      const runningTimeout = function () {
        let timer = null;
        const promise = new Promise(function (resolve, reject) {
          if (timeout) {
            timer = setTimeout(() => {
              if (timer == null) {
                return;
              }

              timer = null;
              reject(logger$4.makeError("timeout", Logger.errors.TIMEOUT, {
                requestBody: bodyify(options.body, flatHeaders["content-type"]),
                requestMethod: options.method,
                timeout: timeout,
                url: url
              }));
            }, timeout);
          }
        });

        const cancel = function () {
          if (timer == null) {
            return;
          }

          clearTimeout(timer);
          timer = null;
        };

        return {
          promise,
          cancel
        };
      }();

      const runningFetch = function () {
        return __awaiter$2(this, void 0, void 0, function* () {
          for (let attempt = 0; attempt < attemptLimit; attempt++) {
            let response = null;

            try {
              response = yield getUrl(url, options);

              if (attempt < attemptLimit) {
                if (response.statusCode === 301 || response.statusCode === 302) {
                  // Redirection; for now we only support absolute locataions
                  const location = response.headers.location || "";

                  if (options.method === "GET" && location.match(/^https:/)) {
                    url = response.headers.location;
                    continue;
                  }
                } else if (response.statusCode === 429) {
                  // Exponential back-off throttling
                  let tryAgain = true;

                  if (throttleCallback) {
                    tryAgain = yield throttleCallback(attempt, url);
                  }

                  if (tryAgain) {
                    let stall = 0;
                    const retryAfter = response.headers["retry-after"];

                    if (typeof retryAfter === "string" && retryAfter.match(/^[1-9][0-9]*$/)) {
                      stall = parseInt(retryAfter) * 1000;
                    } else {
                      stall = throttleSlotInterval * parseInt(String(Math.random() * Math.pow(2, attempt)));
                    } //console.log("Stalling 429");


                    yield staller(stall);
                    continue;
                  }
                }
              }
            } catch (error) {
              response = error.response;

              if (response == null) {
                runningTimeout.cancel();
                logger$4.throwError("missing response", Logger.errors.SERVER_ERROR, {
                  requestBody: bodyify(options.body, flatHeaders["content-type"]),
                  requestMethod: options.method,
                  serverError: error,
                  url: url
                });
              }
            }

            let body = response.body;

            if (allow304 && response.statusCode === 304) {
              body = null;
            } else if (!errorPassThrough && (response.statusCode < 200 || response.statusCode >= 300)) {
              runningTimeout.cancel();
              logger$4.throwError("bad response", Logger.errors.SERVER_ERROR, {
                status: response.statusCode,
                headers: response.headers,
                body: bodyify(body, response.headers ? response.headers["content-type"] : null),
                requestBody: bodyify(options.body, flatHeaders["content-type"]),
                requestMethod: options.method,
                url: url
              });
            }

            if (processFunc) {
              try {
                const result = yield processFunc(body, response);
                runningTimeout.cancel();
                return result;
              } catch (error) {
                // Allow the processFunc to trigger a throttle
                if (error.throttleRetry && attempt < attemptLimit) {
                  let tryAgain = true;

                  if (throttleCallback) {
                    tryAgain = yield throttleCallback(attempt, url);
                  }

                  if (tryAgain) {
                    const timeout = throttleSlotInterval * parseInt(String(Math.random() * Math.pow(2, attempt))); //console.log("Stalling callback");

                    yield staller(timeout);
                    continue;
                  }
                }

                runningTimeout.cancel();
                logger$4.throwError("processing response error", Logger.errors.SERVER_ERROR, {
                  body: bodyify(body, response.headers ? response.headers["content-type"] : null),
                  error: error,
                  requestBody: bodyify(options.body, flatHeaders["content-type"]),
                  requestMethod: options.method,
                  url: url
                });
              }
            }

            runningTimeout.cancel(); // If we had a processFunc, it either returned a T or threw above.
            // The "body" is now a Uint8Array.

            return body;
          }

          return logger$4.throwError("failed response", Logger.errors.SERVER_ERROR, {
            requestBody: bodyify(options.body, flatHeaders["content-type"]),
            requestMethod: options.method,
            url: url
          });
        });
      }();

      return Promise.race([runningTimeout.promise, runningFetch]);
    }
    function fetchJson(connection, json, processFunc) {
      let processJsonFunc = (value, response) => {
        let result = null;

        if (value != null) {
          try {
            result = JSON.parse(toUtf8String(value));
          } catch (error) {
            logger$4.throwError("invalid JSON", Logger.errors.SERVER_ERROR, {
              body: value,
              error: error
            });
          }
        }

        if (processFunc) {
          result = processFunc(result, response);
        }

        return result;
      }; // If we have json to send, we must
      // - add content-type of application/json (unless already overridden)
      // - convert the json to bytes


      let body = null;

      if (json != null) {
        body = toUtf8Bytes(json); // Create a connection with the content-type set for JSON

        const updated = typeof connection === "string" ? {
          url: connection
        } : shallowCopy(connection);

        if (updated.headers) {
          const hasContentType = Object.keys(updated.headers).filter(k => k.toLowerCase() === "content-type").length !== 0;

          if (!hasContentType) {
            updated.headers = shallowCopy(updated.headers);
            updated.headers["content-type"] = "application/json";
          }
        } else {
          updated.headers = {
            "content-type": "application/json"
          };
        }

        connection = updated;
      }

      return _fetchData(connection, body, processJsonFunc);
    }
    function poll(func, options) {
      if (!options) {
        options = {};
      }

      options = shallowCopy(options);

      if (options.floor == null) {
        options.floor = 0;
      }

      if (options.ceiling == null) {
        options.ceiling = 10000;
      }

      if (options.interval == null) {
        options.interval = 250;
      }

      return new Promise(function (resolve, reject) {
        let timer = null;
        let done = false; // Returns true if cancel was successful. Unsuccessful cancel means we're already done.

        const cancel = () => {
          if (done) {
            return false;
          }

          done = true;

          if (timer) {
            clearTimeout(timer);
          }

          return true;
        };

        if (options.timeout) {
          timer = setTimeout(() => {
            if (cancel()) {
              reject(new Error("timeout"));
            }
          }, options.timeout);
        }

        const retryLimit = options.retryLimit;
        let attempt = 0;

        function check() {
          return func().then(function (result) {
            // If we have a result, or are allowed null then we're done
            if (result !== undefined) {
              if (cancel()) {
                resolve(result);
              }
            } else if (options.oncePoll) {
              options.oncePoll.once("poll", check);
            } else if (options.onceBlock) {
              options.onceBlock.once("block", check); // Otherwise, exponential back-off (up to 10s) our next request
            } else if (!done) {
              attempt++;

              if (attempt > retryLimit) {
                if (cancel()) {
                  reject(new Error("retry limit reached"));
                }

                return;
              }

              let timeout = options.interval * parseInt(String(Math.random() * Math.pow(2, attempt)));

              if (timeout < options.floor) {
                timeout = options.floor;
              }

              if (timeout > options.ceiling) {
                timeout = options.ceiling;
              }

              setTimeout(check, timeout);
            }

            return null;
          }, function (error) {
            if (cancel()) {
              reject(error);
            }
          });
        }

        check();
      });
    }

    const version = "providers/5.6.8";

    const logger$3 = new Logger(version);
    class Formatter {
      constructor() {
        this.formats = this.getDefaultFormats();
      }

      getDefaultFormats() {
        const formats = {};
        const address = this.address.bind(this);
        const bigNumber = this.bigNumber.bind(this);
        const blockTag = this.blockTag.bind(this);
        const data = this.data.bind(this);
        const hash = this.hash.bind(this);
        const hex = this.hex.bind(this);
        const number = this.number.bind(this);
        const type = this.type.bind(this);

        const strictData = v => {
          return this.data(v, true);
        };

        formats.transaction = {
          hash: hash,
          type: type,
          accessList: Formatter.allowNull(this.accessList.bind(this), null),
          blockHash: Formatter.allowNull(hash, null),
          blockNumber: Formatter.allowNull(number, null),
          transactionIndex: Formatter.allowNull(number, null),
          confirmations: Formatter.allowNull(number, null),
          from: address,
          // either (gasPrice) or (maxPriorityFeePerGas + maxFeePerGas)
          // must be set
          gasPrice: Formatter.allowNull(bigNumber),
          maxPriorityFeePerGas: Formatter.allowNull(bigNumber),
          maxFeePerGas: Formatter.allowNull(bigNumber),
          gasLimit: bigNumber,
          to: Formatter.allowNull(address, null),
          value: bigNumber,
          nonce: number,
          data: data,
          r: Formatter.allowNull(this.uint256),
          s: Formatter.allowNull(this.uint256),
          v: Formatter.allowNull(number),
          creates: Formatter.allowNull(address, null),
          raw: Formatter.allowNull(data)
        };
        formats.transactionRequest = {
          from: Formatter.allowNull(address),
          nonce: Formatter.allowNull(number),
          gasLimit: Formatter.allowNull(bigNumber),
          gasPrice: Formatter.allowNull(bigNumber),
          maxPriorityFeePerGas: Formatter.allowNull(bigNumber),
          maxFeePerGas: Formatter.allowNull(bigNumber),
          to: Formatter.allowNull(address),
          value: Formatter.allowNull(bigNumber),
          data: Formatter.allowNull(strictData),
          type: Formatter.allowNull(number),
          accessList: Formatter.allowNull(this.accessList.bind(this), null)
        };
        formats.receiptLog = {
          transactionIndex: number,
          blockNumber: number,
          transactionHash: hash,
          address: address,
          topics: Formatter.arrayOf(hash),
          data: data,
          logIndex: number,
          blockHash: hash
        };
        formats.receipt = {
          to: Formatter.allowNull(this.address, null),
          from: Formatter.allowNull(this.address, null),
          contractAddress: Formatter.allowNull(address, null),
          transactionIndex: number,
          // should be allowNull(hash), but broken-EIP-658 support is handled in receipt
          root: Formatter.allowNull(hex),
          gasUsed: bigNumber,
          logsBloom: Formatter.allowNull(data),
          blockHash: hash,
          transactionHash: hash,
          logs: Formatter.arrayOf(this.receiptLog.bind(this)),
          blockNumber: number,
          confirmations: Formatter.allowNull(number, null),
          cumulativeGasUsed: bigNumber,
          effectiveGasPrice: Formatter.allowNull(bigNumber),
          status: Formatter.allowNull(number),
          type: type
        };
        formats.block = {
          hash: Formatter.allowNull(hash),
          parentHash: hash,
          number: number,
          timestamp: number,
          nonce: Formatter.allowNull(hex),
          difficulty: this.difficulty.bind(this),
          gasLimit: bigNumber,
          gasUsed: bigNumber,
          miner: Formatter.allowNull(address),
          extraData: data,
          transactions: Formatter.allowNull(Formatter.arrayOf(hash)),
          baseFeePerGas: Formatter.allowNull(bigNumber)
        };
        formats.blockWithTransactions = shallowCopy(formats.block);
        formats.blockWithTransactions.transactions = Formatter.allowNull(Formatter.arrayOf(this.transactionResponse.bind(this)));
        formats.filter = {
          fromBlock: Formatter.allowNull(blockTag, undefined),
          toBlock: Formatter.allowNull(blockTag, undefined),
          blockHash: Formatter.allowNull(hash, undefined),
          address: Formatter.allowNull(address, undefined),
          topics: Formatter.allowNull(this.topics.bind(this), undefined)
        };
        formats.filterLog = {
          blockNumber: Formatter.allowNull(number),
          blockHash: Formatter.allowNull(hash),
          transactionIndex: number,
          removed: Formatter.allowNull(this.boolean.bind(this)),
          address: address,
          data: Formatter.allowFalsish(data, "0x"),
          topics: Formatter.arrayOf(hash),
          transactionHash: hash,
          logIndex: number
        };
        return formats;
      }

      accessList(accessList) {
        return accessListify(accessList || []);
      } // Requires a BigNumberish that is within the IEEE754 safe integer range; returns a number
      // Strict! Used on input.


      number(number) {
        if (number === "0x") {
          return 0;
        }

        return BigNumber.from(number).toNumber();
      }

      type(number) {
        if (number === "0x" || number == null) {
          return 0;
        }

        return BigNumber.from(number).toNumber();
      } // Strict! Used on input.


      bigNumber(value) {
        return BigNumber.from(value);
      } // Requires a boolean, "true" or  "false"; returns a boolean


      boolean(value) {
        if (typeof value === "boolean") {
          return value;
        }

        if (typeof value === "string") {
          value = value.toLowerCase();

          if (value === "true") {
            return true;
          }

          if (value === "false") {
            return false;
          }
        }

        throw new Error("invalid boolean - " + value);
      }

      hex(value, strict) {
        if (typeof value === "string") {
          if (!strict && value.substring(0, 2) !== "0x") {
            value = "0x" + value;
          }

          if (isHexString(value)) {
            return value.toLowerCase();
          }
        }

        return logger$3.throwArgumentError("invalid hash", "value", value);
      }

      data(value, strict) {
        const result = this.hex(value, strict);

        if (result.length % 2 !== 0) {
          throw new Error("invalid data; odd-length - " + value);
        }

        return result;
      } // Requires an address
      // Strict! Used on input.


      address(value) {
        return getAddress(value);
      }

      callAddress(value) {
        if (!isHexString(value, 32)) {
          return null;
        }

        const address = getAddress(hexDataSlice(value, 12));
        return address === AddressZero ? null : address;
      }

      contractAddress(value) {
        return getContractAddress(value);
      } // Strict! Used on input.


      blockTag(blockTag) {
        if (blockTag == null) {
          return "latest";
        }

        if (blockTag === "earliest") {
          return "0x0";
        }

        if (blockTag === "latest" || blockTag === "pending") {
          return blockTag;
        }

        if (typeof blockTag === "number" || isHexString(blockTag)) {
          return hexValue(blockTag);
        }

        throw new Error("invalid blockTag");
      } // Requires a hash, optionally requires 0x prefix; returns prefixed lowercase hash.


      hash(value, strict) {
        const result = this.hex(value, strict);

        if (hexDataLength(result) !== 32) {
          return logger$3.throwArgumentError("invalid hash", "value", value);
        }

        return result;
      } // Returns the difficulty as a number, or if too large (i.e. PoA network) null


      difficulty(value) {
        if (value == null) {
          return null;
        }

        const v = BigNumber.from(value);

        try {
          return v.toNumber();
        } catch (error) {}

        return null;
      }

      uint256(value) {
        if (!isHexString(value)) {
          throw new Error("invalid uint256");
        }

        return hexZeroPad(value, 32);
      }

      _block(value, format) {
        if (value.author != null && value.miner == null) {
          value.miner = value.author;
        } // The difficulty may need to come from _difficulty in recursed blocks


        const difficulty = value._difficulty != null ? value._difficulty : value.difficulty;
        const result = Formatter.check(format, value);
        result._difficulty = difficulty == null ? null : BigNumber.from(difficulty);
        return result;
      }

      block(value) {
        return this._block(value, this.formats.block);
      }

      blockWithTransactions(value) {
        return this._block(value, this.formats.blockWithTransactions);
      } // Strict! Used on input.


      transactionRequest(value) {
        return Formatter.check(this.formats.transactionRequest, value);
      }

      transactionResponse(transaction) {
        // Rename gas to gasLimit
        if (transaction.gas != null && transaction.gasLimit == null) {
          transaction.gasLimit = transaction.gas;
        } // Some clients (TestRPC) do strange things like return 0x0 for the
        // 0 address; correct this to be a real address


        if (transaction.to && BigNumber.from(transaction.to).isZero()) {
          transaction.to = "0x0000000000000000000000000000000000000000";
        } // Rename input to data


        if (transaction.input != null && transaction.data == null) {
          transaction.data = transaction.input;
        } // If to and creates are empty, populate the creates from the transaction


        if (transaction.to == null && transaction.creates == null) {
          transaction.creates = this.contractAddress(transaction);
        }

        if ((transaction.type === 1 || transaction.type === 2) && transaction.accessList == null) {
          transaction.accessList = [];
        }

        const result = Formatter.check(this.formats.transaction, transaction);

        if (transaction.chainId != null) {
          let chainId = transaction.chainId;

          if (isHexString(chainId)) {
            chainId = BigNumber.from(chainId).toNumber();
          }

          result.chainId = chainId;
        } else {
          let chainId = transaction.networkId; // geth-etc returns chainId

          if (chainId == null && result.v == null) {
            chainId = transaction.chainId;
          }

          if (isHexString(chainId)) {
            chainId = BigNumber.from(chainId).toNumber();
          }

          if (typeof chainId !== "number" && result.v != null) {
            chainId = (result.v - 35) / 2;

            if (chainId < 0) {
              chainId = 0;
            }

            chainId = parseInt(chainId);
          }

          if (typeof chainId !== "number") {
            chainId = 0;
          }

          result.chainId = chainId;
        } // 0x0000... should actually be null


        if (result.blockHash && result.blockHash.replace(/0/g, "") === "x") {
          result.blockHash = null;
        }

        return result;
      }

      transaction(value) {
        return parse(value);
      }

      receiptLog(value) {
        return Formatter.check(this.formats.receiptLog, value);
      }

      receipt(value) {
        const result = Formatter.check(this.formats.receipt, value); // RSK incorrectly implemented EIP-658, so we munge things a bit here for it

        if (result.root != null) {
          if (result.root.length <= 4) {
            // Could be 0x00, 0x0, 0x01 or 0x1
            const value = BigNumber.from(result.root).toNumber();

            if (value === 0 || value === 1) {
              // Make sure if both are specified, they match
              if (result.status != null && result.status !== value) {
                logger$3.throwArgumentError("alt-root-status/status mismatch", "value", {
                  root: result.root,
                  status: result.status
                });
              }

              result.status = value;
              delete result.root;
            } else {
              logger$3.throwArgumentError("invalid alt-root-status", "value.root", result.root);
            }
          } else if (result.root.length !== 66) {
            // Must be a valid bytes32
            logger$3.throwArgumentError("invalid root hash", "value.root", result.root);
          }
        }

        if (result.status != null) {
          result.byzantium = true;
        }

        return result;
      }

      topics(value) {
        if (Array.isArray(value)) {
          return value.map(v => this.topics(v));
        } else if (value != null) {
          return this.hash(value, true);
        }

        return null;
      }

      filter(value) {
        return Formatter.check(this.formats.filter, value);
      }

      filterLog(value) {
        return Formatter.check(this.formats.filterLog, value);
      }

      static check(format, object) {
        const result = {};

        for (const key in format) {
          try {
            const value = format[key](object[key]);

            if (value !== undefined) {
              result[key] = value;
            }
          } catch (error) {
            error.checkKey = key;
            error.checkValue = object[key];
            throw error;
          }
        }

        return result;
      } // if value is null-ish, nullValue is returned


      static allowNull(format, nullValue) {
        return function (value) {
          if (value == null) {
            return nullValue;
          }

          return format(value);
        };
      } // If value is false-ish, replaceValue is returned


      static allowFalsish(format, replaceValue) {
        return function (value) {
          if (!value) {
            return replaceValue;
          }

          return format(value);
        };
      } // Requires an Array satisfying check


      static arrayOf(format) {
        return function (array) {
          if (!Array.isArray(array)) {
            throw new Error("not an array");
          }

          const result = [];
          array.forEach(function (value) {
            result.push(format(value));
          });
          return result;
        };
      }

    }

    var __awaiter$1 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    const logger$2 = new Logger(version);
    const MAX_CCIP_REDIRECTS = 10; //////////////////////////////
    // Event Serializeing

    function checkTopic(topic) {
      if (topic == null) {
        return "null";
      }

      if (hexDataLength(topic) !== 32) {
        logger$2.throwArgumentError("invalid topic", "topic", topic);
      }

      return topic.toLowerCase();
    }

    function serializeTopics(topics) {
      // Remove trailing null AND-topics; they are redundant
      topics = topics.slice();

      while (topics.length > 0 && topics[topics.length - 1] == null) {
        topics.pop();
      }

      return topics.map(topic => {
        if (Array.isArray(topic)) {
          // Only track unique OR-topics
          const unique = {};
          topic.forEach(topic => {
            unique[checkTopic(topic)] = true;
          }); // The order of OR-topics does not matter

          const sorted = Object.keys(unique);
          sorted.sort();
          return sorted.join("|");
        } else {
          return checkTopic(topic);
        }
      }).join("&");
    }

    function deserializeTopics(data) {
      if (data === "") {
        return [];
      }

      return data.split(/&/g).map(topic => {
        if (topic === "") {
          return [];
        }

        const comps = topic.split("|").map(topic => {
          return topic === "null" ? null : topic;
        });
        return comps.length === 1 ? comps[0] : comps;
      });
    }

    function getEventTag(eventName) {
      if (typeof eventName === "string") {
        eventName = eventName.toLowerCase();

        if (hexDataLength(eventName) === 32) {
          return "tx:" + eventName;
        }

        if (eventName.indexOf(":") === -1) {
          return eventName;
        }
      } else if (Array.isArray(eventName)) {
        return "filter:*:" + serializeTopics(eventName);
      } else if (ForkEvent.isForkEvent(eventName)) {
        logger$2.warn("not implemented");
        throw new Error("not implemented");
      } else if (eventName && typeof eventName === "object") {
        return "filter:" + (eventName.address || "*") + ":" + serializeTopics(eventName.topics || []);
      }

      throw new Error("invalid event - " + eventName);
    } //////////////////////////////
    // Helper Object


    function getTime() {
      return new Date().getTime();
    }

    function stall(duration) {
      return new Promise(resolve => {
        setTimeout(resolve, duration);
      });
    } //////////////////////////////
    // Provider Object

    /**
     *  EventType
     *   - "block"
     *   - "poll"
     *   - "didPoll"
     *   - "pending"
     *   - "error"
     *   - "network"
     *   - filter
     *   - topics array
     *   - transaction hash
     */


    const PollableEvents = ["block", "network", "pending", "poll"];
    class Event {
      constructor(tag, listener, once) {
        defineReadOnly(this, "tag", tag);
        defineReadOnly(this, "listener", listener);
        defineReadOnly(this, "once", once);
        this._lastBlockNumber = -2;
        this._inflight = false;
      }

      get event() {
        switch (this.type) {
          case "tx":
            return this.hash;

          case "filter":
            return this.filter;
        }

        return this.tag;
      }

      get type() {
        return this.tag.split(":")[0];
      }

      get hash() {
        const comps = this.tag.split(":");

        if (comps[0] !== "tx") {
          return null;
        }

        return comps[1];
      }

      get filter() {
        const comps = this.tag.split(":");

        if (comps[0] !== "filter") {
          return null;
        }

        const address = comps[1];
        const topics = deserializeTopics(comps[2]);
        const filter = {};

        if (topics.length > 0) {
          filter.topics = topics;
        }

        if (address && address !== "*") {
          filter.address = address;
        }

        return filter;
      }

      pollable() {
        return this.tag.indexOf(":") >= 0 || PollableEvents.indexOf(this.tag) >= 0;
      }

    }

    const coinInfos = {
      "0": {
        symbol: "btc",
        p2pkh: 0x00,
        p2sh: 0x05,
        prefix: "bc"
      },
      "2": {
        symbol: "ltc",
        p2pkh: 0x30,
        p2sh: 0x32,
        prefix: "ltc"
      },
      "3": {
        symbol: "doge",
        p2pkh: 0x1e,
        p2sh: 0x16
      },
      "60": {
        symbol: "eth",
        ilk: "eth"
      },
      "61": {
        symbol: "etc",
        ilk: "eth"
      },
      "700": {
        symbol: "xdai",
        ilk: "eth"
      }
    };

    function bytes32ify(value) {
      return hexZeroPad(BigNumber.from(value).toHexString(), 32);
    } // Compute the Base58Check encoded data (checksum is first 4 bytes of sha256d)


    function base58Encode(data) {
      return Base58.encode(concat([data, hexDataSlice(sha256(sha256(data)), 0, 4)]));
    }

    const matcherIpfs = new RegExp("^(ipfs):/\/(.*)$", "i");
    const matchers = [new RegExp("^(https):/\/(.*)$", "i"), new RegExp("^(data):(.*)$", "i"), matcherIpfs, new RegExp("^eip155:[0-9]+/(erc[0-9]+):(.*)$", "i")];

    function _parseString(result, start) {
      try {
        return toUtf8String(_parseBytes(result, start));
      } catch (error) {}

      return null;
    }

    function _parseBytes(result, start) {
      if (result === "0x") {
        return null;
      }

      const offset = BigNumber.from(hexDataSlice(result, start, start + 32)).toNumber();
      const length = BigNumber.from(hexDataSlice(result, offset, offset + 32)).toNumber();
      return hexDataSlice(result, offset + 32, offset + 32 + length);
    } // Trim off the ipfs:// prefix and return the default gateway URL


    function getIpfsLink(link) {
      if (link.match(/^ipfs:\/\/ipfs\//i)) {
        link = link.substring(12);
      } else if (link.match(/^ipfs:\/\//i)) {
        link = link.substring(7);
      } else {
        logger$2.throwArgumentError("unsupported IPFS format", "link", link);
      }

      return `https:/\/gateway.ipfs.io/ipfs/${link}`;
    }

    function numPad(value) {
      const result = arrayify(value);

      if (result.length > 32) {
        throw new Error("internal; should not happen");
      }

      const padded = new Uint8Array(32);
      padded.set(result, 32 - result.length);
      return padded;
    }

    function bytesPad(value) {
      if (value.length % 32 === 0) {
        return value;
      }

      const result = new Uint8Array(Math.ceil(value.length / 32) * 32);
      result.set(value);
      return result;
    } // ABI Encodes a series of (bytes, bytes, ...)


    function encodeBytes(datas) {
      const result = [];
      let byteCount = 0; // Add place-holders for pointers as we add items

      for (let i = 0; i < datas.length; i++) {
        result.push(null);
        byteCount += 32;
      }

      for (let i = 0; i < datas.length; i++) {
        const data = arrayify(datas[i]); // Update the bytes offset

        result[i] = numPad(byteCount); // The length and padded value of data

        result.push(numPad(data.length));
        result.push(bytesPad(data));
        byteCount += 32 + Math.ceil(data.length / 32) * 32;
      }

      return hexConcat(result);
    }

    class Resolver {
      // The resolvedAddress is only for creating a ReverseLookup resolver
      constructor(provider, address, name, resolvedAddress) {
        defineReadOnly(this, "provider", provider);
        defineReadOnly(this, "name", name);
        defineReadOnly(this, "address", provider.formatter.address(address));
        defineReadOnly(this, "_resolvedAddress", resolvedAddress);
      }

      supportsWildcard() {
        if (!this._supportsEip2544) {
          // supportsInterface(bytes4 = selector("resolve(bytes,bytes)"))
          this._supportsEip2544 = this.provider.call({
            to: this.address,
            data: "0x01ffc9a79061b92300000000000000000000000000000000000000000000000000000000"
          }).then(result => {
            return BigNumber.from(result).eq(1);
          }).catch(error => {
            if (error.code === Logger.errors.CALL_EXCEPTION) {
              return false;
            } // Rethrow the error: link is down, etc. Let future attempts retry.


            this._supportsEip2544 = null;
            throw error;
          });
        }

        return this._supportsEip2544;
      }

      _fetch(selector, parameters) {
        return __awaiter$1(this, void 0, void 0, function* () {
          // e.g. keccak256("addr(bytes32,uint256)")
          const tx = {
            to: this.address,
            ccipReadEnabled: true,
            data: hexConcat([selector, namehash(this.name), parameters || "0x"])
          }; // Wildcard support; use EIP-2544 to resolve the request

          let parseBytes = false;

          if (yield this.supportsWildcard()) {
            parseBytes = true; // selector("resolve(bytes,bytes)")

            tx.data = hexConcat(["0x9061b923", encodeBytes([dnsEncode(this.name), tx.data])]);
          }

          try {
            let result = yield this.provider.call(tx);

            if (arrayify(result).length % 32 === 4) {
              logger$2.throwError("resolver threw error", Logger.errors.CALL_EXCEPTION, {
                transaction: tx,
                data: result
              });
            }

            if (parseBytes) {
              result = _parseBytes(result, 0);
            }

            return result;
          } catch (error) {
            if (error.code === Logger.errors.CALL_EXCEPTION) {
              return null;
            }

            throw error;
          }
        });
      }

      _fetchBytes(selector, parameters) {
        return __awaiter$1(this, void 0, void 0, function* () {
          const result = yield this._fetch(selector, parameters);

          if (result != null) {
            return _parseBytes(result, 0);
          }

          return null;
        });
      }

      _getAddress(coinType, hexBytes) {
        const coinInfo = coinInfos[String(coinType)];

        if (coinInfo == null) {
          logger$2.throwError(`unsupported coin type: ${coinType}`, Logger.errors.UNSUPPORTED_OPERATION, {
            operation: `getAddress(${coinType})`
          });
        }

        if (coinInfo.ilk === "eth") {
          return this.provider.formatter.address(hexBytes);
        }

        const bytes = arrayify(hexBytes); // P2PKH: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG

        if (coinInfo.p2pkh != null) {
          const p2pkh = hexBytes.match(/^0x76a9([0-9a-f][0-9a-f])([0-9a-f]*)88ac$/);

          if (p2pkh) {
            const length = parseInt(p2pkh[1], 16);

            if (p2pkh[2].length === length * 2 && length >= 1 && length <= 75) {
              return base58Encode(concat([[coinInfo.p2pkh], "0x" + p2pkh[2]]));
            }
          }
        } // P2SH: OP_HASH160 <scriptHash> OP_EQUAL


        if (coinInfo.p2sh != null) {
          const p2sh = hexBytes.match(/^0xa9([0-9a-f][0-9a-f])([0-9a-f]*)87$/);

          if (p2sh) {
            const length = parseInt(p2sh[1], 16);

            if (p2sh[2].length === length * 2 && length >= 1 && length <= 75) {
              return base58Encode(concat([[coinInfo.p2sh], "0x" + p2sh[2]]));
            }
          }
        } // Bech32


        if (coinInfo.prefix != null) {
          const length = bytes[1]; // https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#witness-program

          let version = bytes[0];

          if (version === 0x00) {
            if (length !== 20 && length !== 32) {
              version = -1;
            }
          } else {
            version = -1;
          }

          if (version >= 0 && bytes.length === 2 + length && length >= 1 && length <= 75) {
            const words = bech32__default["default"].toWords(bytes.slice(2));
            words.unshift(version);
            return bech32__default["default"].encode(coinInfo.prefix, words);
          }
        }

        return null;
      }

      getAddress(coinType) {
        return __awaiter$1(this, void 0, void 0, function* () {
          if (coinType == null) {
            coinType = 60;
          } // If Ethereum, use the standard `addr(bytes32)`


          if (coinType === 60) {
            try {
              // keccak256("addr(bytes32)")
              const result = yield this._fetch("0x3b3b57de"); // No address

              if (result === "0x" || result === HashZero) {
                return null;
              }

              return this.provider.formatter.callAddress(result);
            } catch (error) {
              if (error.code === Logger.errors.CALL_EXCEPTION) {
                return null;
              }

              throw error;
            }
          } // keccak256("addr(bytes32,uint256")


          const hexBytes = yield this._fetchBytes("0xf1cb7e06", bytes32ify(coinType)); // No address

          if (hexBytes == null || hexBytes === "0x") {
            return null;
          } // Compute the address


          const address = this._getAddress(coinType, hexBytes);

          if (address == null) {
            logger$2.throwError(`invalid or unsupported coin data`, Logger.errors.UNSUPPORTED_OPERATION, {
              operation: `getAddress(${coinType})`,
              coinType: coinType,
              data: hexBytes
            });
          }

          return address;
        });
      }

      getAvatar() {
        return __awaiter$1(this, void 0, void 0, function* () {
          const linkage = [{
            type: "name",
            content: this.name
          }];

          try {
            // test data for ricmoo.eth
            //const avatar = "eip155:1/erc721:0x265385c7f4132228A0d54EB1A9e7460b91c0cC68/29233";
            const avatar = yield this.getText("avatar");

            if (avatar == null) {
              return null;
            }

            for (let i = 0; i < matchers.length; i++) {
              const match = avatar.match(matchers[i]);

              if (match == null) {
                continue;
              }

              const scheme = match[1].toLowerCase();

              switch (scheme) {
                case "https":
                  linkage.push({
                    type: "url",
                    content: avatar
                  });
                  return {
                    linkage,
                    url: avatar
                  };

                case "data":
                  linkage.push({
                    type: "data",
                    content: avatar
                  });
                  return {
                    linkage,
                    url: avatar
                  };

                case "ipfs":
                  linkage.push({
                    type: "ipfs",
                    content: avatar
                  });
                  return {
                    linkage,
                    url: getIpfsLink(avatar)
                  };

                case "erc721":
                case "erc1155":
                  {
                    // Depending on the ERC type, use tokenURI(uint256) or url(uint256)
                    const selector = scheme === "erc721" ? "0xc87b56dd" : "0x0e89341c";
                    linkage.push({
                      type: scheme,
                      content: avatar
                    }); // The owner of this name

                    const owner = this._resolvedAddress || (yield this.getAddress());
                    const comps = (match[2] || "").split("/");

                    if (comps.length !== 2) {
                      return null;
                    }

                    const addr = yield this.provider.formatter.address(comps[0]);
                    const tokenId = hexZeroPad(BigNumber.from(comps[1]).toHexString(), 32); // Check that this account owns the token

                    if (scheme === "erc721") {
                      // ownerOf(uint256 tokenId)
                      const tokenOwner = this.provider.formatter.callAddress(yield this.provider.call({
                        to: addr,
                        data: hexConcat(["0x6352211e", tokenId])
                      }));

                      if (owner !== tokenOwner) {
                        return null;
                      }

                      linkage.push({
                        type: "owner",
                        content: tokenOwner
                      });
                    } else if (scheme === "erc1155") {
                      // balanceOf(address owner, uint256 tokenId)
                      const balance = BigNumber.from(yield this.provider.call({
                        to: addr,
                        data: hexConcat(["0x00fdd58e", hexZeroPad(owner, 32), tokenId])
                      }));

                      if (balance.isZero()) {
                        return null;
                      }

                      linkage.push({
                        type: "balance",
                        content: balance.toString()
                      });
                    } // Call the token contract for the metadata URL


                    const tx = {
                      to: this.provider.formatter.address(comps[0]),
                      data: hexConcat([selector, tokenId])
                    };

                    let metadataUrl = _parseString(yield this.provider.call(tx), 0);

                    if (metadataUrl == null) {
                      return null;
                    }

                    linkage.push({
                      type: "metadata-url-base",
                      content: metadataUrl
                    }); // ERC-1155 allows a generic {id} in the URL

                    if (scheme === "erc1155") {
                      metadataUrl = metadataUrl.replace("{id}", tokenId.substring(2));
                      linkage.push({
                        type: "metadata-url-expanded",
                        content: metadataUrl
                      });
                    } // Transform IPFS metadata links


                    if (metadataUrl.match(/^ipfs:/i)) {
                      metadataUrl = getIpfsLink(metadataUrl);
                    }

                    linkage.push({
                      type: "metadata-url",
                      content: metadataUrl
                    }); // Get the token metadata

                    const metadata = yield fetchJson(metadataUrl);

                    if (!metadata) {
                      return null;
                    }

                    linkage.push({
                      type: "metadata",
                      content: JSON.stringify(metadata)
                    }); // Pull the image URL out

                    let imageUrl = metadata.image;

                    if (typeof imageUrl !== "string") {
                      return null;
                    }

                    if (imageUrl.match(/^(https:\/\/|data:)/i)) {// Allow
                    } else {
                      // Transform IPFS link to gateway
                      const ipfs = imageUrl.match(matcherIpfs);

                      if (ipfs == null) {
                        return null;
                      }

                      linkage.push({
                        type: "url-ipfs",
                        content: imageUrl
                      });
                      imageUrl = getIpfsLink(imageUrl);
                    }

                    linkage.push({
                      type: "url",
                      content: imageUrl
                    });
                    return {
                      linkage,
                      url: imageUrl
                    };
                  }
              }
            }
          } catch (error) {}

          return null;
        });
      }

      getContentHash() {
        return __awaiter$1(this, void 0, void 0, function* () {
          // keccak256("contenthash()")
          const hexBytes = yield this._fetchBytes("0xbc1c58d1"); // No contenthash

          if (hexBytes == null || hexBytes === "0x") {
            return null;
          } // IPFS (CID: 1, Type: DAG-PB)


          const ipfs = hexBytes.match(/^0xe3010170(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/);

          if (ipfs) {
            const length = parseInt(ipfs[3], 16);

            if (ipfs[4].length === length * 2) {
              return "ipfs:/\/" + Base58.encode("0x" + ipfs[1]);
            }
          } // IPNS (CID: 1, Type: libp2p-key)


          const ipns = hexBytes.match(/^0xe5010172(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/);

          if (ipns) {
            const length = parseInt(ipns[3], 16);

            if (ipns[4].length === length * 2) {
              return "ipns:/\/" + Base58.encode("0x" + ipns[1]);
            }
          } // Swarm (CID: 1, Type: swarm-manifest; hash/length hard-coded to keccak256/32)


          const swarm = hexBytes.match(/^0xe40101fa011b20([0-9a-f]*)$/);

          if (swarm) {
            if (swarm[1].length === 32 * 2) {
              return "bzz:/\/" + swarm[1];
            }
          }

          const skynet = hexBytes.match(/^0x90b2c605([0-9a-f]*)$/);

          if (skynet) {
            if (skynet[1].length === 34 * 2) {
              // URL Safe base64; https://datatracker.ietf.org/doc/html/rfc4648#section-5
              const urlSafe = {
                "=": "",
                "+": "-",
                "/": "_"
              };
              const hash = encode("0x" + skynet[1]).replace(/[=+\/]/g, a => urlSafe[a]);
              return "sia:/\/" + hash;
            }
          }

          return logger$2.throwError(`invalid or unsupported content hash data`, Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "getContentHash()",
            data: hexBytes
          });
        });
      }

      getText(key) {
        return __awaiter$1(this, void 0, void 0, function* () {
          // The key encoded as parameter to fetchBytes
          let keyBytes = toUtf8Bytes(key); // The nodehash consumes the first slot, so the string pointer targets
          // offset 64, with the length at offset 64 and data starting at offset 96

          keyBytes = concat([bytes32ify(64), bytes32ify(keyBytes.length), keyBytes]); // Pad to word-size (32 bytes)

          if (keyBytes.length % 32 !== 0) {
            keyBytes = concat([keyBytes, hexZeroPad("0x", 32 - key.length % 32)]);
          }

          const hexBytes = yield this._fetchBytes("0x59d1d43c", hexlify(keyBytes));

          if (hexBytes == null || hexBytes === "0x") {
            return null;
          }

          return toUtf8String(hexBytes);
        });
      }

    }
    let defaultFormatter = null;
    let nextPollId = 1;
    class BaseProvider extends Provider {
      /**
       *  ready
       *
       *  A Promise<Network> that resolves only once the provider is ready.
       *
       *  Sub-classes that call the super with a network without a chainId
       *  MUST set this. Standard named networks have a known chainId.
       *
       */
      constructor(network) {
        super(); // Events being listened to

        this._events = [];
        this._emitted = {
          block: -2
        };
        this.disableCcipRead = false;
        this.formatter = new.target.getFormatter(); // If network is any, this Provider allows the underlying
        // network to change dynamically, and we auto-detect the
        // current network

        defineReadOnly(this, "anyNetwork", network === "any");

        if (this.anyNetwork) {
          network = this.detectNetwork();
        }

        if (network instanceof Promise) {
          this._networkPromise = network; // Squash any "unhandled promise" errors; that do not need to be handled

          network.catch(error => {}); // Trigger initial network setting (async)

          this._ready().catch(error => {});
        } else {
          const knownNetwork = getStatic(new.target, "getNetwork")(network);

          if (knownNetwork) {
            defineReadOnly(this, "_network", knownNetwork);
            this.emit("network", knownNetwork, null);
          } else {
            logger$2.throwArgumentError("invalid network", "network", network);
          }
        }

        this._maxInternalBlockNumber = -1024;
        this._lastBlockNumber = -2;
        this._maxFilterBlockRange = 10;
        this._pollingInterval = 4000;
        this._fastQueryDate = 0;
      }

      _ready() {
        return __awaiter$1(this, void 0, void 0, function* () {
          if (this._network == null) {
            let network = null;

            if (this._networkPromise) {
              try {
                network = yield this._networkPromise;
              } catch (error) {}
            } // Try the Provider's network detection (this MUST throw if it cannot)


            if (network == null) {
              network = yield this.detectNetwork();
            } // This should never happen; every Provider sub-class should have
            // suggested a network by here (or have thrown).


            if (!network) {
              logger$2.throwError("no network detected", Logger.errors.UNKNOWN_ERROR, {});
            } // Possible this call stacked so do not call defineReadOnly again


            if (this._network == null) {
              if (this.anyNetwork) {
                this._network = network;
              } else {
                defineReadOnly(this, "_network", network);
              }

              this.emit("network", network, null);
            }
          }

          return this._network;
        });
      } // This will always return the most recently established network.
      // For "any", this can change (a "network" event is emitted before
      // any change is reflected); otherwise this cannot change


      get ready() {
        return poll(() => {
          return this._ready().then(network => {
            return network;
          }, error => {
            // If the network isn't running yet, we will wait
            if (error.code === Logger.errors.NETWORK_ERROR && error.event === "noNetwork") {
              return undefined;
            }

            throw error;
          });
        });
      } // @TODO: Remove this and just create a singleton formatter


      static getFormatter() {
        if (defaultFormatter == null) {
          defaultFormatter = new Formatter();
        }

        return defaultFormatter;
      } // @TODO: Remove this and just use getNetwork


      static getNetwork(network) {
        return getNetwork(network == null ? "homestead" : network);
      }

      ccipReadFetch(tx, calldata, urls) {
        return __awaiter$1(this, void 0, void 0, function* () {
          if (this.disableCcipRead || urls.length === 0) {
            return null;
          }

          const sender = tx.to.toLowerCase();
          const data = calldata.toLowerCase();
          const errorMessages = [];

          for (let i = 0; i < urls.length; i++) {
            const url = urls[i]; // URL expansion

            const href = url.replace("{sender}", sender).replace("{data}", data); // If no {data} is present, use POST; otherwise GET

            const json = url.indexOf("{data}") >= 0 ? null : JSON.stringify({
              data,
              sender
            });
            const result = yield fetchJson({
              url: href,
              errorPassThrough: true
            }, json, (value, response) => {
              value.status = response.statusCode;
              return value;
            });

            if (result.data) {
              return result.data;
            }

            const errorMessage = result.message || "unknown error"; // 4xx indicates the result is not present; stop

            if (result.status >= 400 && result.status < 500) {
              return logger$2.throwError(`response not found during CCIP fetch: ${errorMessage}`, Logger.errors.SERVER_ERROR, {
                url,
                errorMessage
              });
            } // 5xx indicates server issue; try the next url


            errorMessages.push(errorMessage);
          }

          return logger$2.throwError(`error encountered during CCIP fetch: ${errorMessages.map(m => JSON.stringify(m)).join(", ")}`, Logger.errors.SERVER_ERROR, {
            urls,
            errorMessages
          });
        });
      } // Fetches the blockNumber, but will reuse any result that is less
      // than maxAge old or has been requested since the last request


      _getInternalBlockNumber(maxAge) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this._ready(); // Allowing stale data up to maxAge old

          if (maxAge > 0) {
            // While there are pending internal block requests...
            while (this._internalBlockNumber) {
              // ..."remember" which fetch we started with
              const internalBlockNumber = this._internalBlockNumber;

              try {
                // Check the result is not too stale
                const result = yield internalBlockNumber;

                if (getTime() - result.respTime <= maxAge) {
                  return result.blockNumber;
                } // Too old; fetch a new value


                break;
              } catch (error) {
                // The fetch rejected; if we are the first to get the
                // rejection, drop through so we replace it with a new
                // fetch; all others blocked will then get that fetch
                // which won't match the one they "remembered" and loop
                if (this._internalBlockNumber === internalBlockNumber) {
                  break;
                }
              }
            }
          }

          const reqTime = getTime();
          const checkInternalBlockNumber = resolveProperties({
            blockNumber: this.perform("getBlockNumber", {}),
            networkError: this.getNetwork().then(network => null, error => error)
          }).then(({
            blockNumber,
            networkError
          }) => {
            if (networkError) {
              // Unremember this bad internal block number
              if (this._internalBlockNumber === checkInternalBlockNumber) {
                this._internalBlockNumber = null;
              }

              throw networkError;
            }

            const respTime = getTime();
            blockNumber = BigNumber.from(blockNumber).toNumber();

            if (blockNumber < this._maxInternalBlockNumber) {
              blockNumber = this._maxInternalBlockNumber;
            }

            this._maxInternalBlockNumber = blockNumber;

            this._setFastBlockNumber(blockNumber); // @TODO: Still need this?


            return {
              blockNumber,
              reqTime,
              respTime
            };
          });
          this._internalBlockNumber = checkInternalBlockNumber; // Swallow unhandled exceptions; if needed they are handled else where

          checkInternalBlockNumber.catch(error => {
            // Don't null the dead (rejected) fetch, if it has already been updated
            if (this._internalBlockNumber === checkInternalBlockNumber) {
              this._internalBlockNumber = null;
            }
          });
          return (yield checkInternalBlockNumber).blockNumber;
        });
      }

      poll() {
        return __awaiter$1(this, void 0, void 0, function* () {
          const pollId = nextPollId++; // Track all running promises, so we can trigger a post-poll once they are complete

          const runners = [];
          let blockNumber = null;

          try {
            blockNumber = yield this._getInternalBlockNumber(100 + this.pollingInterval / 2);
          } catch (error) {
            this.emit("error", error);
            return;
          }

          this._setFastBlockNumber(blockNumber); // Emit a poll event after we have the latest (fast) block number


          this.emit("poll", pollId, blockNumber); // If the block has not changed, meh.

          if (blockNumber === this._lastBlockNumber) {
            this.emit("didPoll", pollId);
            return;
          } // First polling cycle, trigger a "block" events


          if (this._emitted.block === -2) {
            this._emitted.block = blockNumber - 1;
          }

          if (Math.abs(this._emitted.block - blockNumber) > 1000) {
            logger$2.warn(`network block skew detected; skipping block events (emitted=${this._emitted.block} blockNumber${blockNumber})`);
            this.emit("error", logger$2.makeError("network block skew detected", Logger.errors.NETWORK_ERROR, {
              blockNumber: blockNumber,
              event: "blockSkew",
              previousBlockNumber: this._emitted.block
            }));
            this.emit("block", blockNumber);
          } else {
            // Notify all listener for each block that has passed
            for (let i = this._emitted.block + 1; i <= blockNumber; i++) {
              this.emit("block", i);
            }
          } // The emitted block was updated, check for obsolete events


          if (this._emitted.block !== blockNumber) {
            this._emitted.block = blockNumber;
            Object.keys(this._emitted).forEach(key => {
              // The block event does not expire
              if (key === "block") {
                return;
              } // The block we were at when we emitted this event


              const eventBlockNumber = this._emitted[key]; // We cannot garbage collect pending transactions or blocks here
              // They should be garbage collected by the Provider when setting
              // "pending" events

              if (eventBlockNumber === "pending") {
                return;
              } // Evict any transaction hashes or block hashes over 12 blocks
              // old, since they should not return null anyways


              if (blockNumber - eventBlockNumber > 12) {
                delete this._emitted[key];
              }
            });
          } // First polling cycle


          if (this._lastBlockNumber === -2) {
            this._lastBlockNumber = blockNumber - 1;
          } // Find all transaction hashes we are waiting on


          this._events.forEach(event => {
            switch (event.type) {
              case "tx":
                {
                  const hash = event.hash;
                  let runner = this.getTransactionReceipt(hash).then(receipt => {
                    if (!receipt || receipt.blockNumber == null) {
                      return null;
                    }

                    this._emitted["t:" + hash] = receipt.blockNumber;
                    this.emit(hash, receipt);
                    return null;
                  }).catch(error => {
                    this.emit("error", error);
                  });
                  runners.push(runner);
                  break;
                }

              case "filter":
                {
                  // We only allow a single getLogs to be in-flight at a time
                  if (!event._inflight) {
                    event._inflight = true; // Filter from the last known event; due to load-balancing
                    // and some nodes returning updated block numbers before
                    // indexing events, a logs result with 0 entries cannot be
                    // trusted and we must retry a range which includes it again

                    const filter = event.filter;
                    filter.fromBlock = event._lastBlockNumber + 1;
                    filter.toBlock = blockNumber; // Prevent fitler ranges from growing too wild

                    if (filter.toBlock - this._maxFilterBlockRange > filter.fromBlock) {
                      filter.fromBlock = filter.toBlock - this._maxFilterBlockRange;
                    }

                    const runner = this.getLogs(filter).then(logs => {
                      // Allow the next getLogs
                      event._inflight = false;

                      if (logs.length === 0) {
                        return;
                      }

                      logs.forEach(log => {
                        // Only when we get an event for a given block number
                        // can we trust the events are indexed
                        if (log.blockNumber > event._lastBlockNumber) {
                          event._lastBlockNumber = log.blockNumber;
                        } // Make sure we stall requests to fetch blocks and txs


                        this._emitted["b:" + log.blockHash] = log.blockNumber;
                        this._emitted["t:" + log.transactionHash] = log.blockNumber;
                        this.emit(filter, log);
                      });
                    }).catch(error => {
                      this.emit("error", error); // Allow another getLogs (the range was not updated)

                      event._inflight = false;
                    });
                    runners.push(runner);
                  }

                  break;
                }
            }
          });

          this._lastBlockNumber = blockNumber; // Once all events for this loop have been processed, emit "didPoll"

          Promise.all(runners).then(() => {
            this.emit("didPoll", pollId);
          }).catch(error => {
            this.emit("error", error);
          });
          return;
        });
      } // Deprecated; do not use this


      resetEventsBlock(blockNumber) {
        this._lastBlockNumber = blockNumber - 1;

        if (this.polling) {
          this.poll();
        }
      }

      get network() {
        return this._network;
      } // This method should query the network if the underlying network
      // can change, such as when connected to a JSON-RPC backend


      detectNetwork() {
        return __awaiter$1(this, void 0, void 0, function* () {
          return logger$2.throwError("provider does not support network detection", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "provider.detectNetwork"
          });
        });
      }

      getNetwork() {
        return __awaiter$1(this, void 0, void 0, function* () {
          const network = yield this._ready(); // Make sure we are still connected to the same network; this is
          // only an external call for backends which can have the underlying
          // network change spontaneously

          const currentNetwork = yield this.detectNetwork();

          if (network.chainId !== currentNetwork.chainId) {
            // We are allowing network changes, things can get complex fast;
            // make sure you know what you are doing if you use "any"
            if (this.anyNetwork) {
              this._network = currentNetwork; // Reset all internal block number guards and caches

              this._lastBlockNumber = -2;
              this._fastBlockNumber = null;
              this._fastBlockNumberPromise = null;
              this._fastQueryDate = 0;
              this._emitted.block = -2;
              this._maxInternalBlockNumber = -1024;
              this._internalBlockNumber = null; // The "network" event MUST happen before this method resolves
              // so any events have a chance to unregister, so we stall an
              // additional event loop before returning from /this/ call

              this.emit("network", currentNetwork, network);
              yield stall(0);
              return this._network;
            }

            const error = logger$2.makeError("underlying network changed", Logger.errors.NETWORK_ERROR, {
              event: "changed",
              network: network,
              detectedNetwork: currentNetwork
            });
            this.emit("error", error);
            throw error;
          }

          return network;
        });
      }

      get blockNumber() {
        this._getInternalBlockNumber(100 + this.pollingInterval / 2).then(blockNumber => {
          this._setFastBlockNumber(blockNumber);
        }, error => {});

        return this._fastBlockNumber != null ? this._fastBlockNumber : -1;
      }

      get polling() {
        return this._poller != null;
      }

      set polling(value) {
        if (value && !this._poller) {
          this._poller = setInterval(() => {
            this.poll();
          }, this.pollingInterval);

          if (!this._bootstrapPoll) {
            this._bootstrapPoll = setTimeout(() => {
              this.poll(); // We block additional polls until the polling interval
              // is done, to prevent overwhelming the poll function

              this._bootstrapPoll = setTimeout(() => {
                // If polling was disabled, something may require a poke
                // since starting the bootstrap poll and it was disabled
                if (!this._poller) {
                  this.poll();
                } // Clear out the bootstrap so we can do another


                this._bootstrapPoll = null;
              }, this.pollingInterval);
            }, 0);
          }
        } else if (!value && this._poller) {
          clearInterval(this._poller);
          this._poller = null;
        }
      }

      get pollingInterval() {
        return this._pollingInterval;
      }

      set pollingInterval(value) {
        if (typeof value !== "number" || value <= 0 || parseInt(String(value)) != value) {
          throw new Error("invalid polling interval");
        }

        this._pollingInterval = value;

        if (this._poller) {
          clearInterval(this._poller);
          this._poller = setInterval(() => {
            this.poll();
          }, this._pollingInterval);
        }
      }

      _getFastBlockNumber() {
        const now = getTime(); // Stale block number, request a newer value

        if (now - this._fastQueryDate > 2 * this._pollingInterval) {
          this._fastQueryDate = now;
          this._fastBlockNumberPromise = this.getBlockNumber().then(blockNumber => {
            if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
              this._fastBlockNumber = blockNumber;
            }

            return this._fastBlockNumber;
          });
        }

        return this._fastBlockNumberPromise;
      }

      _setFastBlockNumber(blockNumber) {
        // Older block, maybe a stale request
        if (this._fastBlockNumber != null && blockNumber < this._fastBlockNumber) {
          return;
        } // Update the time we updated the blocknumber


        this._fastQueryDate = getTime(); // Newer block number, use  it

        if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
          this._fastBlockNumber = blockNumber;
          this._fastBlockNumberPromise = Promise.resolve(blockNumber);
        }
      }

      waitForTransaction(transactionHash, confirmations, timeout) {
        return __awaiter$1(this, void 0, void 0, function* () {
          return this._waitForTransaction(transactionHash, confirmations == null ? 1 : confirmations, timeout || 0, null);
        });
      }

      _waitForTransaction(transactionHash, confirmations, timeout, replaceable) {
        return __awaiter$1(this, void 0, void 0, function* () {
          const receipt = yield this.getTransactionReceipt(transactionHash); // Receipt is already good

          if ((receipt ? receipt.confirmations : 0) >= confirmations) {
            return receipt;
          } // Poll until the receipt is good...


          return new Promise((resolve, reject) => {
            const cancelFuncs = [];
            let done = false;

            const alreadyDone = function () {
              if (done) {
                return true;
              }

              done = true;
              cancelFuncs.forEach(func => {
                func();
              });
              return false;
            };

            const minedHandler = receipt => {
              if (receipt.confirmations < confirmations) {
                return;
              }

              if (alreadyDone()) {
                return;
              }

              resolve(receipt);
            };

            this.on(transactionHash, minedHandler);
            cancelFuncs.push(() => {
              this.removeListener(transactionHash, minedHandler);
            });

            if (replaceable) {
              let lastBlockNumber = replaceable.startBlock;
              let scannedBlock = null;

              const replaceHandler = blockNumber => __awaiter$1(this, void 0, void 0, function* () {
                if (done) {
                  return;
                } // Wait 1 second; this is only used in the case of a fault, so
                // we will trade off a little bit of latency for more consistent
                // results and fewer JSON-RPC calls


                yield stall(1000);
                this.getTransactionCount(replaceable.from).then(nonce => __awaiter$1(this, void 0, void 0, function* () {
                  if (done) {
                    return;
                  }

                  if (nonce <= replaceable.nonce) {
                    lastBlockNumber = blockNumber;
                  } else {
                    // First check if the transaction was mined
                    {
                      const mined = yield this.getTransaction(transactionHash);

                      if (mined && mined.blockNumber != null) {
                        return;
                      }
                    } // First time scanning. We start a little earlier for some
                    // wiggle room here to handle the eventually consistent nature
                    // of blockchain (e.g. the getTransactionCount was for a
                    // different block)

                    if (scannedBlock == null) {
                      scannedBlock = lastBlockNumber - 3;

                      if (scannedBlock < replaceable.startBlock) {
                        scannedBlock = replaceable.startBlock;
                      }
                    }

                    while (scannedBlock <= blockNumber) {
                      if (done) {
                        return;
                      }

                      const block = yield this.getBlockWithTransactions(scannedBlock);

                      for (let ti = 0; ti < block.transactions.length; ti++) {
                        const tx = block.transactions[ti]; // Successfully mined!

                        if (tx.hash === transactionHash) {
                          return;
                        } // Matches our transaction from and nonce; its a replacement


                        if (tx.from === replaceable.from && tx.nonce === replaceable.nonce) {
                          if (done) {
                            return;
                          } // Get the receipt of the replacement


                          const receipt = yield this.waitForTransaction(tx.hash, confirmations); // Already resolved or rejected (prolly a timeout)

                          if (alreadyDone()) {
                            return;
                          } // The reason we were replaced


                          let reason = "replaced";

                          if (tx.data === replaceable.data && tx.to === replaceable.to && tx.value.eq(replaceable.value)) {
                            reason = "repriced";
                          } else if (tx.data === "0x" && tx.from === tx.to && tx.value.isZero()) {
                            reason = "cancelled";
                          } // Explain why we were replaced


                          reject(logger$2.makeError("transaction was replaced", Logger.errors.TRANSACTION_REPLACED, {
                            cancelled: reason === "replaced" || reason === "cancelled",
                            reason,
                            replacement: this._wrapTransaction(tx),
                            hash: transactionHash,
                            receipt
                          }));
                          return;
                        }
                      }

                      scannedBlock++;
                    }
                  }

                  if (done) {
                    return;
                  }

                  this.once("block", replaceHandler);
                }), error => {
                  if (done) {
                    return;
                  }

                  this.once("block", replaceHandler);
                });
              });

              if (done) {
                return;
              }

              this.once("block", replaceHandler);
              cancelFuncs.push(() => {
                this.removeListener("block", replaceHandler);
              });
            }

            if (typeof timeout === "number" && timeout > 0) {
              const timer = setTimeout(() => {
                if (alreadyDone()) {
                  return;
                }

                reject(logger$2.makeError("timeout exceeded", Logger.errors.TIMEOUT, {
                  timeout: timeout
                }));
              }, timeout);

              if (timer.unref) {
                timer.unref();
              }

              cancelFuncs.push(() => {
                clearTimeout(timer);
              });
            }
          });
        });
      }

      getBlockNumber() {
        return __awaiter$1(this, void 0, void 0, function* () {
          return this._getInternalBlockNumber(0);
        });
      }

      getGasPrice() {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const result = yield this.perform("getGasPrice", {});

          try {
            return BigNumber.from(result);
          } catch (error) {
            return logger$2.throwError("bad result from backend", Logger.errors.SERVER_ERROR, {
              method: "getGasPrice",
              result,
              error
            });
          }
        });
      }

      getBalance(addressOrName, blockTag) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const params = yield resolveProperties({
            address: this._getAddress(addressOrName),
            blockTag: this._getBlockTag(blockTag)
          });
          const result = yield this.perform("getBalance", params);

          try {
            return BigNumber.from(result);
          } catch (error) {
            return logger$2.throwError("bad result from backend", Logger.errors.SERVER_ERROR, {
              method: "getBalance",
              params,
              result,
              error
            });
          }
        });
      }

      getTransactionCount(addressOrName, blockTag) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const params = yield resolveProperties({
            address: this._getAddress(addressOrName),
            blockTag: this._getBlockTag(blockTag)
          });
          const result = yield this.perform("getTransactionCount", params);

          try {
            return BigNumber.from(result).toNumber();
          } catch (error) {
            return logger$2.throwError("bad result from backend", Logger.errors.SERVER_ERROR, {
              method: "getTransactionCount",
              params,
              result,
              error
            });
          }
        });
      }

      getCode(addressOrName, blockTag) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const params = yield resolveProperties({
            address: this._getAddress(addressOrName),
            blockTag: this._getBlockTag(blockTag)
          });
          const result = yield this.perform("getCode", params);

          try {
            return hexlify(result);
          } catch (error) {
            return logger$2.throwError("bad result from backend", Logger.errors.SERVER_ERROR, {
              method: "getCode",
              params,
              result,
              error
            });
          }
        });
      }

      getStorageAt(addressOrName, position, blockTag) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const params = yield resolveProperties({
            address: this._getAddress(addressOrName),
            blockTag: this._getBlockTag(blockTag),
            position: Promise.resolve(position).then(p => hexValue(p))
          });
          const result = yield this.perform("getStorageAt", params);

          try {
            return hexlify(result);
          } catch (error) {
            return logger$2.throwError("bad result from backend", Logger.errors.SERVER_ERROR, {
              method: "getStorageAt",
              params,
              result,
              error
            });
          }
        });
      } // This should be called by any subclass wrapping a TransactionResponse


      _wrapTransaction(tx, hash, startBlock) {
        if (hash != null && hexDataLength(hash) !== 32) {
          throw new Error("invalid response - sendTransaction");
        }

        const result = tx; // Check the hash we expect is the same as the hash the server reported

        if (hash != null && tx.hash !== hash) {
          logger$2.throwError("Transaction hash mismatch from Provider.sendTransaction.", Logger.errors.UNKNOWN_ERROR, {
            expectedHash: tx.hash,
            returnedHash: hash
          });
        }

        result.wait = (confirms, timeout) => __awaiter$1(this, void 0, void 0, function* () {
          if (confirms == null) {
            confirms = 1;
          }

          if (timeout == null) {
            timeout = 0;
          } // Get the details to detect replacement


          let replacement = undefined;

          if (confirms !== 0 && startBlock != null) {
            replacement = {
              data: tx.data,
              from: tx.from,
              nonce: tx.nonce,
              to: tx.to,
              value: tx.value,
              startBlock
            };
          }

          const receipt = yield this._waitForTransaction(tx.hash, confirms, timeout, replacement);

          if (receipt == null && confirms === 0) {
            return null;
          } // No longer pending, allow the polling loop to garbage collect this


          this._emitted["t:" + tx.hash] = receipt.blockNumber;

          if (receipt.status === 0) {
            logger$2.throwError("transaction failed", Logger.errors.CALL_EXCEPTION, {
              transactionHash: tx.hash,
              transaction: tx,
              receipt: receipt
            });
          }

          return receipt;
        });

        return result;
      }

      sendTransaction(signedTransaction) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const hexTx = yield Promise.resolve(signedTransaction).then(t => hexlify(t));
          const tx = this.formatter.transaction(signedTransaction);

          if (tx.confirmations == null) {
            tx.confirmations = 0;
          }

          const blockNumber = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);

          try {
            const hash = yield this.perform("sendTransaction", {
              signedTransaction: hexTx
            });
            return this._wrapTransaction(tx, hash, blockNumber);
          } catch (error) {
            error.transaction = tx;
            error.transactionHash = tx.hash;
            throw error;
          }
        });
      }

      _getTransactionRequest(transaction) {
        return __awaiter$1(this, void 0, void 0, function* () {
          const values = yield transaction;
          const tx = {};
          ["from", "to"].forEach(key => {
            if (values[key] == null) {
              return;
            }

            tx[key] = Promise.resolve(values[key]).then(v => v ? this._getAddress(v) : null);
          });
          ["gasLimit", "gasPrice", "maxFeePerGas", "maxPriorityFeePerGas", "value"].forEach(key => {
            if (values[key] == null) {
              return;
            }

            tx[key] = Promise.resolve(values[key]).then(v => v ? BigNumber.from(v) : null);
          });
          ["type"].forEach(key => {
            if (values[key] == null) {
              return;
            }

            tx[key] = Promise.resolve(values[key]).then(v => v != null ? v : null);
          });

          if (values.accessList) {
            tx.accessList = this.formatter.accessList(values.accessList);
          }

          ["data"].forEach(key => {
            if (values[key] == null) {
              return;
            }

            tx[key] = Promise.resolve(values[key]).then(v => v ? hexlify(v) : null);
          });
          return this.formatter.transactionRequest(yield resolveProperties(tx));
        });
      }

      _getFilter(filter) {
        return __awaiter$1(this, void 0, void 0, function* () {
          filter = yield filter;
          const result = {};

          if (filter.address != null) {
            result.address = this._getAddress(filter.address);
          }

          ["blockHash", "topics"].forEach(key => {
            if (filter[key] == null) {
              return;
            }

            result[key] = filter[key];
          });
          ["fromBlock", "toBlock"].forEach(key => {
            if (filter[key] == null) {
              return;
            }

            result[key] = this._getBlockTag(filter[key]);
          });
          return this.formatter.filter(yield resolveProperties(result));
        });
      }

      _call(transaction, blockTag, attempt) {
        return __awaiter$1(this, void 0, void 0, function* () {
          if (attempt >= MAX_CCIP_REDIRECTS) {
            logger$2.throwError("CCIP read exceeded maximum redirections", Logger.errors.SERVER_ERROR, {
              redirects: attempt,
              transaction
            });
          }

          const txSender = transaction.to;
          const result = yield this.perform("call", {
            transaction,
            blockTag
          }); // CCIP Read request via OffchainLookup(address,string[],bytes,bytes4,bytes)

          if (attempt >= 0 && blockTag === "latest" && txSender != null && result.substring(0, 10) === "0x556f1830" && hexDataLength(result) % 32 === 4) {
            try {
              const data = hexDataSlice(result, 4); // Check the sender of the OffchainLookup matches the transaction

              const sender = hexDataSlice(data, 0, 32);

              if (!BigNumber.from(sender).eq(txSender)) {
                logger$2.throwError("CCIP Read sender did not match", Logger.errors.CALL_EXCEPTION, {
                  name: "OffchainLookup",
                  signature: "OffchainLookup(address,string[],bytes,bytes4,bytes)",
                  transaction,
                  data: result
                });
              } // Read the URLs from the response


              const urls = [];
              const urlsOffset = BigNumber.from(hexDataSlice(data, 32, 64)).toNumber();
              const urlsLength = BigNumber.from(hexDataSlice(data, urlsOffset, urlsOffset + 32)).toNumber();
              const urlsData = hexDataSlice(data, urlsOffset + 32);

              for (let u = 0; u < urlsLength; u++) {
                const url = _parseString(urlsData, u * 32);

                if (url == null) {
                  logger$2.throwError("CCIP Read contained corrupt URL string", Logger.errors.CALL_EXCEPTION, {
                    name: "OffchainLookup",
                    signature: "OffchainLookup(address,string[],bytes,bytes4,bytes)",
                    transaction,
                    data: result
                  });
                }

                urls.push(url);
              } // Get the CCIP calldata to forward


              const calldata = _parseBytes(data, 64); // Get the callbackSelector (bytes4)


              if (!BigNumber.from(hexDataSlice(data, 100, 128)).isZero()) {
                logger$2.throwError("CCIP Read callback selector included junk", Logger.errors.CALL_EXCEPTION, {
                  name: "OffchainLookup",
                  signature: "OffchainLookup(address,string[],bytes,bytes4,bytes)",
                  transaction,
                  data: result
                });
              }

              const callbackSelector = hexDataSlice(data, 96, 100); // Get the extra data to send back to the contract as context

              const extraData = _parseBytes(data, 128);

              const ccipResult = yield this.ccipReadFetch(transaction, calldata, urls);

              if (ccipResult == null) {
                logger$2.throwError("CCIP Read disabled or provided no URLs", Logger.errors.CALL_EXCEPTION, {
                  name: "OffchainLookup",
                  signature: "OffchainLookup(address,string[],bytes,bytes4,bytes)",
                  transaction,
                  data: result
                });
              }

              const tx = {
                to: txSender,
                data: hexConcat([callbackSelector, encodeBytes([ccipResult, extraData])])
              };
              return this._call(tx, blockTag, attempt + 1);
            } catch (error) {
              if (error.code === Logger.errors.SERVER_ERROR) {
                throw error;
              }
            }
          }

          try {
            return hexlify(result);
          } catch (error) {
            return logger$2.throwError("bad result from backend", Logger.errors.SERVER_ERROR, {
              method: "call",
              params: {
                transaction,
                blockTag
              },
              result,
              error
            });
          }
        });
      }

      call(transaction, blockTag) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const resolved = yield resolveProperties({
            transaction: this._getTransactionRequest(transaction),
            blockTag: this._getBlockTag(blockTag),
            ccipReadEnabled: Promise.resolve(transaction.ccipReadEnabled)
          });
          return this._call(resolved.transaction, resolved.blockTag, resolved.ccipReadEnabled ? 0 : -1);
        });
      }

      estimateGas(transaction) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const params = yield resolveProperties({
            transaction: this._getTransactionRequest(transaction)
          });
          const result = yield this.perform("estimateGas", params);

          try {
            return BigNumber.from(result);
          } catch (error) {
            return logger$2.throwError("bad result from backend", Logger.errors.SERVER_ERROR, {
              method: "estimateGas",
              params,
              result,
              error
            });
          }
        });
      }

      _getAddress(addressOrName) {
        return __awaiter$1(this, void 0, void 0, function* () {
          addressOrName = yield addressOrName;

          if (typeof addressOrName !== "string") {
            logger$2.throwArgumentError("invalid address or ENS name", "name", addressOrName);
          }

          const address = yield this.resolveName(addressOrName);

          if (address == null) {
            logger$2.throwError("ENS name not configured", Logger.errors.UNSUPPORTED_OPERATION, {
              operation: `resolveName(${JSON.stringify(addressOrName)})`
            });
          }

          return address;
        });
      }

      _getBlock(blockHashOrBlockTag, includeTransactions) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          blockHashOrBlockTag = yield blockHashOrBlockTag; // If blockTag is a number (not "latest", etc), this is the block number

          let blockNumber = -128;
          const params = {
            includeTransactions: !!includeTransactions
          };

          if (isHexString(blockHashOrBlockTag, 32)) {
            params.blockHash = blockHashOrBlockTag;
          } else {
            try {
              params.blockTag = yield this._getBlockTag(blockHashOrBlockTag);

              if (isHexString(params.blockTag)) {
                blockNumber = parseInt(params.blockTag.substring(2), 16);
              }
            } catch (error) {
              logger$2.throwArgumentError("invalid block hash or block tag", "blockHashOrBlockTag", blockHashOrBlockTag);
            }
          }

          return poll(() => __awaiter$1(this, void 0, void 0, function* () {
            const block = yield this.perform("getBlock", params); // Block was not found

            if (block == null) {
              // For blockhashes, if we didn't say it existed, that blockhash may
              // not exist. If we did see it though, perhaps from a log, we know
              // it exists, and this node is just not caught up yet.
              if (params.blockHash != null) {
                if (this._emitted["b:" + params.blockHash] == null) {
                  return null;
                }
              } // For block tags, if we are asking for a future block, we return null


              if (params.blockTag != null) {
                if (blockNumber > this._emitted.block) {
                  return null;
                }
              } // Retry on the next block


              return undefined;
            } // Add transactions


            if (includeTransactions) {
              let blockNumber = null;

              for (let i = 0; i < block.transactions.length; i++) {
                const tx = block.transactions[i];

                if (tx.blockNumber == null) {
                  tx.confirmations = 0;
                } else if (tx.confirmations == null) {
                  if (blockNumber == null) {
                    blockNumber = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
                  } // Add the confirmations using the fast block number (pessimistic)


                  let confirmations = blockNumber - tx.blockNumber + 1;

                  if (confirmations <= 0) {
                    confirmations = 1;
                  }

                  tx.confirmations = confirmations;
                }
              }

              const blockWithTxs = this.formatter.blockWithTransactions(block);
              blockWithTxs.transactions = blockWithTxs.transactions.map(tx => this._wrapTransaction(tx));
              return blockWithTxs;
            }

            return this.formatter.block(block);
          }), {
            oncePoll: this
          });
        });
      }

      getBlock(blockHashOrBlockTag) {
        return this._getBlock(blockHashOrBlockTag, false);
      }

      getBlockWithTransactions(blockHashOrBlockTag) {
        return this._getBlock(blockHashOrBlockTag, true);
      }

      getTransaction(transactionHash) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          transactionHash = yield transactionHash;
          const params = {
            transactionHash: this.formatter.hash(transactionHash, true)
          };
          return poll(() => __awaiter$1(this, void 0, void 0, function* () {
            const result = yield this.perform("getTransaction", params);

            if (result == null) {
              if (this._emitted["t:" + transactionHash] == null) {
                return null;
              }

              return undefined;
            }

            const tx = this.formatter.transactionResponse(result);

            if (tx.blockNumber == null) {
              tx.confirmations = 0;
            } else if (tx.confirmations == null) {
              const blockNumber = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval); // Add the confirmations using the fast block number (pessimistic)

              let confirmations = blockNumber - tx.blockNumber + 1;

              if (confirmations <= 0) {
                confirmations = 1;
              }

              tx.confirmations = confirmations;
            }

            return this._wrapTransaction(tx);
          }), {
            oncePoll: this
          });
        });
      }

      getTransactionReceipt(transactionHash) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          transactionHash = yield transactionHash;
          const params = {
            transactionHash: this.formatter.hash(transactionHash, true)
          };
          return poll(() => __awaiter$1(this, void 0, void 0, function* () {
            const result = yield this.perform("getTransactionReceipt", params);

            if (result == null) {
              if (this._emitted["t:" + transactionHash] == null) {
                return null;
              }

              return undefined;
            } // "geth-etc" returns receipts before they are ready


            if (result.blockHash == null) {
              return undefined;
            }

            const receipt = this.formatter.receipt(result);

            if (receipt.blockNumber == null) {
              receipt.confirmations = 0;
            } else if (receipt.confirmations == null) {
              const blockNumber = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval); // Add the confirmations using the fast block number (pessimistic)

              let confirmations = blockNumber - receipt.blockNumber + 1;

              if (confirmations <= 0) {
                confirmations = 1;
              }

              receipt.confirmations = confirmations;
            }

            return receipt;
          }), {
            oncePoll: this
          });
        });
      }

      getLogs(filter) {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          const params = yield resolveProperties({
            filter: this._getFilter(filter)
          });
          const logs = yield this.perform("getLogs", params);
          logs.forEach(log => {
            if (log.removed == null) {
              log.removed = false;
            }
          });
          return Formatter.arrayOf(this.formatter.filterLog.bind(this.formatter))(logs);
        });
      }

      getEtherPrice() {
        return __awaiter$1(this, void 0, void 0, function* () {
          yield this.getNetwork();
          return this.perform("getEtherPrice", {});
        });
      }

      _getBlockTag(blockTag) {
        return __awaiter$1(this, void 0, void 0, function* () {
          blockTag = yield blockTag;

          if (typeof blockTag === "number" && blockTag < 0) {
            if (blockTag % 1) {
              logger$2.throwArgumentError("invalid BlockTag", "blockTag", blockTag);
            }

            let blockNumber = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
            blockNumber += blockTag;

            if (blockNumber < 0) {
              blockNumber = 0;
            }

            return this.formatter.blockTag(blockNumber);
          }

          return this.formatter.blockTag(blockTag);
        });
      }

      getResolver(name) {
        return __awaiter$1(this, void 0, void 0, function* () {
          let currentName = name;

          while (true) {
            if (currentName === "" || currentName === ".") {
              return null;
            } // Optimization since the eth node cannot change and does
            // not have a wildcard resolver


            if (name !== "eth" && currentName === "eth") {
              return null;
            } // Check the current node for a resolver


            const addr = yield this._getResolver(currentName, "getResolver"); // Found a resolver!

            if (addr != null) {
              const resolver = new Resolver(this, addr, name); // Legacy resolver found, using EIP-2544 so it isn't safe to use

              if (currentName !== name && !(yield resolver.supportsWildcard())) {
                return null;
              }

              return resolver;
            } // Get the parent node


            currentName = currentName.split(".").slice(1).join(".");
          }
        });
      }

      _getResolver(name, operation) {
        return __awaiter$1(this, void 0, void 0, function* () {
          if (operation == null) {
            operation = "ENS";
          }

          const network = yield this.getNetwork(); // No ENS...

          if (!network.ensAddress) {
            logger$2.throwError("network does not support ENS", Logger.errors.UNSUPPORTED_OPERATION, {
              operation,
              network: network.name
            });
          }

          try {
            // keccak256("resolver(bytes32)")
            const addrData = yield this.call({
              to: network.ensAddress,
              data: "0x0178b8bf" + namehash(name).substring(2)
            });
            return this.formatter.callAddress(addrData);
          } catch (error) {// ENS registry cannot throw errors on resolver(bytes32)
          }

          return null;
        });
      }

      resolveName(name) {
        return __awaiter$1(this, void 0, void 0, function* () {
          name = yield name; // If it is already an address, nothing to resolve

          try {
            return Promise.resolve(this.formatter.address(name));
          } catch (error) {
            // If is is a hexstring, the address is bad (See #694)
            if (isHexString(name)) {
              throw error;
            }
          }

          if (typeof name !== "string") {
            logger$2.throwArgumentError("invalid ENS name", "name", name);
          } // Get the addr from the resolver


          const resolver = yield this.getResolver(name);

          if (!resolver) {
            return null;
          }

          return yield resolver.getAddress();
        });
      }

      lookupAddress(address) {
        return __awaiter$1(this, void 0, void 0, function* () {
          address = yield address;
          address = this.formatter.address(address);
          const node = address.substring(2).toLowerCase() + ".addr.reverse";
          const resolverAddr = yield this._getResolver(node, "lookupAddress");

          if (resolverAddr == null) {
            return null;
          } // keccak("name(bytes32)")


          const name = _parseString(yield this.call({
            to: resolverAddr,
            data: "0x691f3431" + namehash(node).substring(2)
          }), 0);

          const addr = yield this.resolveName(name);

          if (addr != address) {
            return null;
          }

          return name;
        });
      }

      getAvatar(nameOrAddress) {
        return __awaiter$1(this, void 0, void 0, function* () {
          let resolver = null;

          if (isHexString(nameOrAddress)) {
            // Address; reverse lookup
            const address = this.formatter.address(nameOrAddress);
            const node = address.substring(2).toLowerCase() + ".addr.reverse";
            const resolverAddress = yield this._getResolver(node, "getAvatar");

            if (!resolverAddress) {
              return null;
            } // Try resolving the avatar against the addr.reverse resolver


            resolver = new Resolver(this, resolverAddress, node);

            try {
              const avatar = yield resolver.getAvatar();

              if (avatar) {
                return avatar.url;
              }
            } catch (error) {
              if (error.code !== Logger.errors.CALL_EXCEPTION) {
                throw error;
              }
            } // Try getting the name and performing forward lookup; allowing wildcards


            try {
              // keccak("name(bytes32)")
              const name = _parseString(yield this.call({
                to: resolverAddress,
                data: "0x691f3431" + namehash(node).substring(2)
              }), 0);

              resolver = yield this.getResolver(name);
            } catch (error) {
              if (error.code !== Logger.errors.CALL_EXCEPTION) {
                throw error;
              }

              return null;
            }
          } else {
            // ENS name; forward lookup with wildcard
            resolver = yield this.getResolver(nameOrAddress);

            if (!resolver) {
              return null;
            }
          }

          const avatar = yield resolver.getAvatar();

          if (avatar == null) {
            return null;
          }

          return avatar.url;
        });
      }

      perform(method, params) {
        return logger$2.throwError(method + " not implemented", Logger.errors.NOT_IMPLEMENTED, {
          operation: method
        });
      }

      _startEvent(event) {
        this.polling = this._events.filter(e => e.pollable()).length > 0;
      }

      _stopEvent(event) {
        this.polling = this._events.filter(e => e.pollable()).length > 0;
      }

      _addEventListener(eventName, listener, once) {
        const event = new Event(getEventTag(eventName), listener, once);

        this._events.push(event);

        this._startEvent(event);

        return this;
      }

      on(eventName, listener) {
        return this._addEventListener(eventName, listener, false);
      }

      once(eventName, listener) {
        return this._addEventListener(eventName, listener, true);
      }

      emit(eventName, ...args) {
        let result = false;
        let stopped = [];
        let eventTag = getEventTag(eventName);
        this._events = this._events.filter(event => {
          if (event.tag !== eventTag) {
            return true;
          }

          setTimeout(() => {
            event.listener.apply(this, args);
          }, 0);
          result = true;

          if (event.once) {
            stopped.push(event);
            return false;
          }

          return true;
        });
        stopped.forEach(event => {
          this._stopEvent(event);
        });
        return result;
      }

      listenerCount(eventName) {
        if (!eventName) {
          return this._events.length;
        }

        let eventTag = getEventTag(eventName);
        return this._events.filter(event => {
          return event.tag === eventTag;
        }).length;
      }

      listeners(eventName) {
        if (eventName == null) {
          return this._events.map(event => event.listener);
        }

        let eventTag = getEventTag(eventName);
        return this._events.filter(event => event.tag === eventTag).map(event => event.listener);
      }

      off(eventName, listener) {
        if (listener == null) {
          return this.removeAllListeners(eventName);
        }

        const stopped = [];
        let found = false;
        let eventTag = getEventTag(eventName);
        this._events = this._events.filter(event => {
          if (event.tag !== eventTag || event.listener != listener) {
            return true;
          }

          if (found) {
            return true;
          }

          found = true;
          stopped.push(event);
          return false;
        });
        stopped.forEach(event => {
          this._stopEvent(event);
        });
        return this;
      }

      removeAllListeners(eventName) {
        let stopped = [];

        if (eventName == null) {
          stopped = this._events;
          this._events = [];
        } else {
          const eventTag = getEventTag(eventName);
          this._events = this._events.filter(event => {
            if (event.tag !== eventTag) {
              return true;
            }

            stopped.push(event);
            return false;
          });
        }

        stopped.forEach(event => {
          this._stopEvent(event);
        });
        return this;
      }

    }

    var __awaiter = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    const logger$1 = new Logger(version);
    const errorGas = ["call", "estimateGas"];

    function spelunk(value, requireData) {
      if (value == null) {
        return null;
      } // These *are* the droids we're looking for.


      if (typeof value.message === "string" && value.message.match("reverted")) {
        const data = isHexString(value.data) ? value.data : null;

        if (!requireData || data) {
          return {
            message: value.message,
            data
          };
        }
      } // Spelunk further...


      if (typeof value === "object") {
        for (const key in value) {
          const result = spelunk(value[key], requireData);

          if (result) {
            return result;
          }
        }

        return null;
      } // Might be a JSON string we can further descend...


      if (typeof value === "string") {
        try {
          return spelunk(JSON.parse(value), requireData);
        } catch (error) {}
      }

      return null;
    }

    function checkError(method, error, params) {
      const transaction = params.transaction || params.signedTransaction; // Undo the "convenience" some nodes are attempting to prevent backwards
      // incompatibility; maybe for v6 consider forwarding reverts as errors

      if (method === "call") {
        const result = spelunk(error, true);

        if (result) {
          return result.data;
        } // Nothing descriptive..


        logger$1.throwError("missing revert data in call exception; Transaction reverted without a reason string", Logger.errors.CALL_EXCEPTION, {
          data: "0x",
          transaction,
          error
        });
      }

      if (method === "estimateGas") {
        // Try to find something, with a preference on SERVER_ERROR body
        let result = spelunk(error.body, false);

        if (result == null) {
          result = spelunk(error, false);
        } // Found "reverted", this is a CALL_EXCEPTION


        if (result) {
          logger$1.throwError("cannot estimate gas; transaction may fail or may require manual gas limit", Logger.errors.UNPREDICTABLE_GAS_LIMIT, {
            reason: result.message,
            method,
            transaction,
            error
          });
        }
      } // @TODO: Should we spelunk for message too?


      let message = error.message;

      if (error.code === Logger.errors.SERVER_ERROR && error.error && typeof error.error.message === "string") {
        message = error.error.message;
      } else if (typeof error.body === "string") {
        message = error.body;
      } else if (typeof error.responseText === "string") {
        message = error.responseText;
      }

      message = (message || "").toLowerCase(); // "insufficient funds for gas * price + value + cost(data)"

      if (message.match(/insufficient funds|base fee exceeds gas limit/i)) {
        logger$1.throwError("insufficient funds for intrinsic transaction cost", Logger.errors.INSUFFICIENT_FUNDS, {
          error,
          method,
          transaction
        });
      } // "nonce too low"


      if (message.match(/nonce (is )?too low/i)) {
        logger$1.throwError("nonce has already been used", Logger.errors.NONCE_EXPIRED, {
          error,
          method,
          transaction
        });
      } // "replacement transaction underpriced"


      if (message.match(/replacement transaction underpriced|transaction gas price.*too low/i)) {
        logger$1.throwError("replacement fee too low", Logger.errors.REPLACEMENT_UNDERPRICED, {
          error,
          method,
          transaction
        });
      } // "replacement transaction underpriced"


      if (message.match(/only replay-protected/i)) {
        logger$1.throwError("legacy pre-eip-155 transactions not supported", Logger.errors.UNSUPPORTED_OPERATION, {
          error,
          method,
          transaction
        });
      }

      if (errorGas.indexOf(method) >= 0 && message.match(/gas required exceeds allowance|always failing transaction|execution reverted/)) {
        logger$1.throwError("cannot estimate gas; transaction may fail or may require manual gas limit", Logger.errors.UNPREDICTABLE_GAS_LIMIT, {
          error,
          method,
          transaction
        });
      }

      throw error;
    }

    function timer(timeout) {
      return new Promise(function (resolve) {
        setTimeout(resolve, timeout);
      });
    }

    function getResult(payload) {
      if (payload.error) {
        // @TODO: not any
        const error = new Error(payload.error.message);
        error.code = payload.error.code;
        error.data = payload.error.data;
        throw error;
      }

      return payload.result;
    }

    function getLowerCase(value) {
      if (value) {
        return value.toLowerCase();
      }

      return value;
    }

    const _constructorGuard = {};
    class JsonRpcSigner extends Signer {
      constructor(constructorGuard, provider, addressOrIndex) {
        super();

        if (constructorGuard !== _constructorGuard) {
          throw new Error("do not call the JsonRpcSigner constructor directly; use provider.getSigner");
        }

        defineReadOnly(this, "provider", provider);

        if (addressOrIndex == null) {
          addressOrIndex = 0;
        }

        if (typeof addressOrIndex === "string") {
          defineReadOnly(this, "_address", this.provider.formatter.address(addressOrIndex));
          defineReadOnly(this, "_index", null);
        } else if (typeof addressOrIndex === "number") {
          defineReadOnly(this, "_index", addressOrIndex);
          defineReadOnly(this, "_address", null);
        } else {
          logger$1.throwArgumentError("invalid address or index", "addressOrIndex", addressOrIndex);
        }
      }

      connect(provider) {
        return logger$1.throwError("cannot alter JSON-RPC Signer connection", Logger.errors.UNSUPPORTED_OPERATION, {
          operation: "connect"
        });
      }

      connectUnchecked() {
        return new UncheckedJsonRpcSigner(_constructorGuard, this.provider, this._address || this._index);
      }

      getAddress() {
        if (this._address) {
          return Promise.resolve(this._address);
        }

        return this.provider.send("eth_accounts", []).then(accounts => {
          if (accounts.length <= this._index) {
            logger$1.throwError("unknown account #" + this._index, Logger.errors.UNSUPPORTED_OPERATION, {
              operation: "getAddress"
            });
          }

          return this.provider.formatter.address(accounts[this._index]);
        });
      }

      sendUncheckedTransaction(transaction) {
        transaction = shallowCopy(transaction);
        const fromAddress = this.getAddress().then(address => {
          if (address) {
            address = address.toLowerCase();
          }

          return address;
        }); // The JSON-RPC for eth_sendTransaction uses 90000 gas; if the user
        // wishes to use this, it is easy to specify explicitly, otherwise
        // we look it up for them.

        if (transaction.gasLimit == null) {
          const estimate = shallowCopy(transaction);
          estimate.from = fromAddress;
          transaction.gasLimit = this.provider.estimateGas(estimate);
        }

        if (transaction.to != null) {
          transaction.to = Promise.resolve(transaction.to).then(to => __awaiter(this, void 0, void 0, function* () {
            if (to == null) {
              return null;
            }

            const address = yield this.provider.resolveName(to);

            if (address == null) {
              logger$1.throwArgumentError("provided ENS name resolves to null", "tx.to", to);
            }

            return address;
          }));
        }

        return resolveProperties({
          tx: resolveProperties(transaction),
          sender: fromAddress
        }).then(({
          tx,
          sender
        }) => {
          if (tx.from != null) {
            if (tx.from.toLowerCase() !== sender) {
              logger$1.throwArgumentError("from address mismatch", "transaction", transaction);
            }
          } else {
            tx.from = sender;
          }

          const hexTx = this.provider.constructor.hexlifyTransaction(tx, {
            from: true
          });
          return this.provider.send("eth_sendTransaction", [hexTx]).then(hash => {
            return hash;
          }, error => {
            return checkError("sendTransaction", error, hexTx);
          });
        });
      }

      signTransaction(transaction) {
        return logger$1.throwError("signing transactions is unsupported", Logger.errors.UNSUPPORTED_OPERATION, {
          operation: "signTransaction"
        });
      }

      sendTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
          // This cannot be mined any earlier than any recent block
          const blockNumber = yield this.provider._getInternalBlockNumber(100 + 2 * this.provider.pollingInterval); // Send the transaction

          const hash = yield this.sendUncheckedTransaction(transaction);

          try {
            // Unfortunately, JSON-RPC only provides and opaque transaction hash
            // for a response, and we need the actual transaction, so we poll
            // for it; it should show up very quickly
            return yield poll(() => __awaiter(this, void 0, void 0, function* () {
              const tx = yield this.provider.getTransaction(hash);

              if (tx === null) {
                return undefined;
              }

              return this.provider._wrapTransaction(tx, hash, blockNumber);
            }), {
              oncePoll: this.provider
            });
          } catch (error) {
            error.transactionHash = hash;
            throw error;
          }
        });
      }

      signMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
          const data = typeof message === "string" ? toUtf8Bytes(message) : message;
          const address = yield this.getAddress();
          return yield this.provider.send("personal_sign", [hexlify(data), address.toLowerCase()]);
        });
      }

      _legacySignMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
          const data = typeof message === "string" ? toUtf8Bytes(message) : message;
          const address = yield this.getAddress(); // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign

          return yield this.provider.send("eth_sign", [address.toLowerCase(), hexlify(data)]);
        });
      }

      _signTypedData(domain, types, value) {
        return __awaiter(this, void 0, void 0, function* () {
          // Populate any ENS names (in-place)
          const populated = yield TypedDataEncoder.resolveNames(domain, types, value, name => {
            return this.provider.resolveName(name);
          });
          const address = yield this.getAddress();
          return yield this.provider.send("eth_signTypedData_v4", [address.toLowerCase(), JSON.stringify(TypedDataEncoder.getPayload(populated.domain, types, populated.value))]);
        });
      }

      unlock(password) {
        return __awaiter(this, void 0, void 0, function* () {
          const provider = this.provider;
          const address = yield this.getAddress();
          return provider.send("personal_unlockAccount", [address.toLowerCase(), password, null]);
        });
      }

    }

    class UncheckedJsonRpcSigner extends JsonRpcSigner {
      sendTransaction(transaction) {
        return this.sendUncheckedTransaction(transaction).then(hash => {
          return {
            hash: hash,
            nonce: null,
            gasLimit: null,
            gasPrice: null,
            data: null,
            value: null,
            chainId: null,
            confirmations: 0,
            from: null,
            wait: confirmations => {
              return this.provider.waitForTransaction(hash, confirmations);
            }
          };
        });
      }

    }

    const allowedTransactionKeys = {
      chainId: true,
      data: true,
      gasLimit: true,
      gasPrice: true,
      nonce: true,
      to: true,
      value: true,
      type: true,
      accessList: true,
      maxFeePerGas: true,
      maxPriorityFeePerGas: true
    };
    class JsonRpcProvider extends BaseProvider {
      constructor(url, network) {
        let networkOrReady = network; // The network is unknown, query the JSON-RPC for it

        if (networkOrReady == null) {
          networkOrReady = new Promise((resolve, reject) => {
            setTimeout(() => {
              this.detectNetwork().then(network => {
                resolve(network);
              }, error => {
                reject(error);
              });
            }, 0);
          });
        }

        super(networkOrReady); // Default URL

        if (!url) {
          url = getStatic(this.constructor, "defaultUrl")();
        }

        if (typeof url === "string") {
          defineReadOnly(this, "connection", Object.freeze({
            url: url
          }));
        } else {
          defineReadOnly(this, "connection", Object.freeze(shallowCopy(url)));
        }

        this._nextId = 42;
      }

      get _cache() {
        if (this._eventLoopCache == null) {
          this._eventLoopCache = {};
        }

        return this._eventLoopCache;
      }

      static defaultUrl() {
        return "http:/\/localhost:8545";
      }

      detectNetwork() {
        if (!this._cache["detectNetwork"]) {
          this._cache["detectNetwork"] = this._uncachedDetectNetwork(); // Clear this cache at the beginning of the next event loop

          setTimeout(() => {
            this._cache["detectNetwork"] = null;
          }, 0);
        }

        return this._cache["detectNetwork"];
      }

      _uncachedDetectNetwork() {
        return __awaiter(this, void 0, void 0, function* () {
          yield timer(0);
          let chainId = null;

          try {
            chainId = yield this.send("eth_chainId", []);
          } catch (error) {
            try {
              chainId = yield this.send("net_version", []);
            } catch (error) {}
          }

          if (chainId != null) {
            const getNetwork = getStatic(this.constructor, "getNetwork");

            try {
              return getNetwork(BigNumber.from(chainId).toNumber());
            } catch (error) {
              return logger$1.throwError("could not detect network", Logger.errors.NETWORK_ERROR, {
                chainId: chainId,
                event: "invalidNetwork",
                serverError: error
              });
            }
          }

          return logger$1.throwError("could not detect network", Logger.errors.NETWORK_ERROR, {
            event: "noNetwork"
          });
        });
      }

      getSigner(addressOrIndex) {
        return new JsonRpcSigner(_constructorGuard, this, addressOrIndex);
      }

      getUncheckedSigner(addressOrIndex) {
        return this.getSigner(addressOrIndex).connectUnchecked();
      }

      listAccounts() {
        return this.send("eth_accounts", []).then(accounts => {
          return accounts.map(a => this.formatter.address(a));
        });
      }

      send(method, params) {
        const request = {
          method: method,
          params: params,
          id: this._nextId++,
          jsonrpc: "2.0"
        };
        this.emit("debug", {
          action: "request",
          request: deepCopy(request),
          provider: this
        }); // We can expand this in the future to any call, but for now these
        // are the biggest wins and do not require any serializing parameters.

        const cache = ["eth_chainId", "eth_blockNumber"].indexOf(method) >= 0;

        if (cache && this._cache[method]) {
          return this._cache[method];
        }

        const result = fetchJson(this.connection, JSON.stringify(request), getResult).then(result => {
          this.emit("debug", {
            action: "response",
            request: request,
            response: result,
            provider: this
          });
          return result;
        }, error => {
          this.emit("debug", {
            action: "response",
            error: error,
            request: request,
            provider: this
          });
          throw error;
        }); // Cache the fetch, but clear it on the next event loop

        if (cache) {
          this._cache[method] = result;
          setTimeout(() => {
            this._cache[method] = null;
          }, 0);
        }

        return result;
      }

      prepareRequest(method, params) {
        switch (method) {
          case "getBlockNumber":
            return ["eth_blockNumber", []];

          case "getGasPrice":
            return ["eth_gasPrice", []];

          case "getBalance":
            return ["eth_getBalance", [getLowerCase(params.address), params.blockTag]];

          case "getTransactionCount":
            return ["eth_getTransactionCount", [getLowerCase(params.address), params.blockTag]];

          case "getCode":
            return ["eth_getCode", [getLowerCase(params.address), params.blockTag]];

          case "getStorageAt":
            return ["eth_getStorageAt", [getLowerCase(params.address), hexZeroPad(params.position, 32), params.blockTag]];

          case "sendTransaction":
            return ["eth_sendRawTransaction", [params.signedTransaction]];

          case "getBlock":
            if (params.blockTag) {
              return ["eth_getBlockByNumber", [params.blockTag, !!params.includeTransactions]];
            } else if (params.blockHash) {
              return ["eth_getBlockByHash", [params.blockHash, !!params.includeTransactions]];
            }

            return null;

          case "getTransaction":
            return ["eth_getTransactionByHash", [params.transactionHash]];

          case "getTransactionReceipt":
            return ["eth_getTransactionReceipt", [params.transactionHash]];

          case "call":
            {
              const hexlifyTransaction = getStatic(this.constructor, "hexlifyTransaction");
              return ["eth_call", [hexlifyTransaction(params.transaction, {
                from: true
              }), params.blockTag]];
            }

          case "estimateGas":
            {
              const hexlifyTransaction = getStatic(this.constructor, "hexlifyTransaction");
              return ["eth_estimateGas", [hexlifyTransaction(params.transaction, {
                from: true
              })]];
            }

          case "getLogs":
            if (params.filter && params.filter.address != null) {
              params.filter.address = getLowerCase(params.filter.address);
            }

            return ["eth_getLogs", [params.filter]];
        }

        return null;
      }

      perform(method, params) {
        return __awaiter(this, void 0, void 0, function* () {
          // Legacy networks do not like the type field being passed along (which
          // is fair), so we delete type if it is 0 and a non-EIP-1559 network
          if (method === "call" || method === "estimateGas") {
            const tx = params.transaction;

            if (tx && tx.type != null && BigNumber.from(tx.type).isZero()) {
              // If there are no EIP-1559 properties, it might be non-EIP-1559
              if (tx.maxFeePerGas == null && tx.maxPriorityFeePerGas == null) {
                const feeData = yield this.getFeeData();

                if (feeData.maxFeePerGas == null && feeData.maxPriorityFeePerGas == null) {
                  // Network doesn't know about EIP-1559 (and hence type)
                  params = shallowCopy(params);
                  params.transaction = shallowCopy(tx);
                  delete params.transaction.type;
                }
              }
            }
          }

          const args = this.prepareRequest(method, params);

          if (args == null) {
            logger$1.throwError(method + " not implemented", Logger.errors.NOT_IMPLEMENTED, {
              operation: method
            });
          }

          try {
            return yield this.send(args[0], args[1]);
          } catch (error) {
            return checkError(method, error, params);
          }
        });
      }

      _startEvent(event) {
        if (event.tag === "pending") {
          this._startPending();
        }

        super._startEvent(event);
      }

      _startPending() {
        if (this._pendingFilter != null) {
          return;
        }

        const self = this;
        const pendingFilter = this.send("eth_newPendingTransactionFilter", []);
        this._pendingFilter = pendingFilter;
        pendingFilter.then(function (filterId) {
          function poll() {
            self.send("eth_getFilterChanges", [filterId]).then(function (hashes) {
              if (self._pendingFilter != pendingFilter) {
                return null;
              }

              let seq = Promise.resolve();
              hashes.forEach(function (hash) {
                // @TODO: This should be garbage collected at some point... How? When?
                self._emitted["t:" + hash.toLowerCase()] = "pending";
                seq = seq.then(function () {
                  return self.getTransaction(hash).then(function (tx) {
                    self.emit("pending", tx);
                    return null;
                  });
                });
              });
              return seq.then(function () {
                return timer(1000);
              });
            }).then(function () {
              if (self._pendingFilter != pendingFilter) {
                self.send("eth_uninstallFilter", [filterId]);
                return;
              }

              setTimeout(function () {
                poll();
              }, 0);
              return null;
            }).catch(error => {});
          }

          poll();
          return filterId;
        }).catch(error => {});
      }

      _stopEvent(event) {
        if (event.tag === "pending" && this.listenerCount("pending") === 0) {
          this._pendingFilter = null;
        }

        super._stopEvent(event);
      } // Convert an ethers.js transaction into a JSON-RPC transaction
      //  - gasLimit => gas
      //  - All values hexlified
      //  - All numeric values zero-striped
      //  - All addresses are lowercased
      // NOTE: This allows a TransactionRequest, but all values should be resolved
      //       before this is called
      // @TODO: This will likely be removed in future versions and prepareRequest
      //        will be the preferred method for this.


      static hexlifyTransaction(transaction, allowExtra) {
        // Check only allowed properties are given
        const allowed = shallowCopy(allowedTransactionKeys);

        if (allowExtra) {
          for (const key in allowExtra) {
            if (allowExtra[key]) {
              allowed[key] = true;
            }
          }
        }

        checkProperties(transaction, allowed);
        const result = {}; // JSON-RPC now requires numeric values to be "quantity" values

        ["chainId", "gasLimit", "gasPrice", "type", "maxFeePerGas", "maxPriorityFeePerGas", "nonce", "value"].forEach(function (key) {
          if (transaction[key] == null) {
            return;
          }

          const value = hexValue(BigNumber.from(transaction[key]));

          if (key === "gasLimit") {
            key = "gas";
          }

          result[key] = value;
        });
        ["from", "to", "data"].forEach(function (key) {
          if (transaction[key] == null) {
            return;
          }

          result[key] = hexlify(transaction[key]);
        });

        if (transaction.accessList) {
          result["accessList"] = accessListify(transaction.accessList);
        }

        return result;
      }

    }

    const logger = new Logger(version);
    let _nextId = 1;

    function buildWeb3LegacyFetcher(provider, sendFunc) {
      const fetcher = "Web3LegacyFetcher";
      return function (method, params) {
        const request = {
          method: method,
          params: params,
          id: _nextId++,
          jsonrpc: "2.0"
        };
        return new Promise((resolve, reject) => {
          this.emit("debug", {
            action: "request",
            fetcher,
            request: deepCopy(request),
            provider: this
          });
          sendFunc(request, (error, response) => {
            if (error) {
              this.emit("debug", {
                action: "response",
                fetcher,
                error,
                request,
                provider: this
              });
              return reject(error);
            }

            this.emit("debug", {
              action: "response",
              fetcher,
              request,
              response,
              provider: this
            });

            if (response.error) {
              const error = new Error(response.error.message);
              error.code = response.error.code;
              error.data = response.error.data;
              return reject(error);
            }

            resolve(response.result);
          });
        });
      };
    }

    function buildEip1193Fetcher(provider) {
      return function (method, params) {
        if (params == null) {
          params = [];
        }

        const request = {
          method,
          params
        };
        this.emit("debug", {
          action: "request",
          fetcher: "Eip1193Fetcher",
          request: deepCopy(request),
          provider: this
        });
        return provider.request(request).then(response => {
          this.emit("debug", {
            action: "response",
            fetcher: "Eip1193Fetcher",
            request,
            response,
            provider: this
          });
          return response;
        }, error => {
          this.emit("debug", {
            action: "response",
            fetcher: "Eip1193Fetcher",
            request,
            error,
            provider: this
          });
          throw error;
        });
      };
    }

    class Web3Provider extends JsonRpcProvider {
      constructor(provider, network) {
        if (provider == null) {
          logger.throwArgumentError("missing provider", "provider", provider);
        }

        let path = null;
        let jsonRpcFetchFunc = null;
        let subprovider = null;

        if (typeof provider === "function") {
          path = "unknown:";
          jsonRpcFetchFunc = provider;
        } else {
          path = provider.host || provider.path || "";

          if (!path && provider.isMetaMask) {
            path = "metamask";
          }

          subprovider = provider;

          if (provider.request) {
            if (path === "") {
              path = "eip-1193:";
            }

            jsonRpcFetchFunc = buildEip1193Fetcher(provider);
          } else if (provider.sendAsync) {
            jsonRpcFetchFunc = buildWeb3LegacyFetcher(provider, provider.sendAsync.bind(provider));
          } else if (provider.send) {
            jsonRpcFetchFunc = buildWeb3LegacyFetcher(provider, provider.send.bind(provider));
          } else {
            logger.throwArgumentError("unsupported provider", "provider", provider);
          }

          if (!path) {
            path = "unknown:";
          }
        }

        super(path, network);
        defineReadOnly(this, "jsonRpcFetchFunc", jsonRpcFetchFunc);
        defineReadOnly(this, "provider", subprovider);
      }

      send(method, params) {
        return this.jsonRpcFetchFunc(method, params);
      }

    }

    class WalletController extends Controller {
      static targets = ["connectButton", "disconnectButton", "rentDiv"];
      static classes = ["hidden"];
      static contractProvider = null;
      static contract = null;
      static modal = null;
      static provider = null;
      static network = null;
      static chainId = null;

      async connectWallet() {
        const providerOptions = {
          walletconnect: {
            package: WalletConnectProvider__default["default"],
            options: {
              rpc: {
                CHAIN_ID: RPC_PROVIDER
              }
            }
          }
        };
        this.modal = new Web3Modal__default["default"]({
          cacheProvider: false,
          providerOptions
        });
        this.instance = await this.modal.connect();
        this.provider = new Web3Provider(this.instance);
        this.network = await this.provider.getNetwork();
        this.chainId = this.network.chainId;
        this.connectButtonTarget.classList.add(hiddenClass);
        this.disconnectButtonTarget.classList.remove(hiddenClass);
        this.rentDivTarget.classList.remove(hiddenClass);
      }

    }

    window.Stimulus = Application.start();

    Stimulus.handleError = (error, message, detail) => {
      console.warn(message, detail);
      ErrorTrackingSystem.captureException(error);
    };
    Stimulus.register("wallet", WalletController);

})(Web3Modal, WalletConnectProvider, sha3, BN$1, hash, bech32);
