import { Inject, Injectable, PACKAGE_ROOT_URL } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';

import { Subject } from 'rxjs/Rx';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { Config } from '../config';
import { TransportService, TransportState } from './transport.service';

import * as mqtt from 'mqtt';

export class MQTTPacket {
  public received_at: Date;
  public topic: string;
  public message: string;
  public packet: mqtt.Packet;
  constructor () {
    this.received_at = new Date();
  }
}
/**
 * Angular2 Message Queue Service using MQTT.js
 *
 * @description This service handles subscribing to a
 * message queue using the mqtt library, and returns
 * values via the ES6 Observable specification for
 * asynchronous value streaming by wiring messages
 * into a Subject observable.
 */
@Injectable()
export class MQTTService implements TransportService {

  /* Service parameters */

  // State of the MQService
  public state: BehaviorSubject<TransportState>;

  // Publishes new messages to Observers
  public messages: Subject<MQTTPacket>;

  // Configuration structure with MQ creds
  protected config: Config;

  // MQTT Client from MQTT.js
  private client: mqtt.Client;

  // Resolve Promise made to calling class, when connected
  private resolvePromise: (...args: any[]) => void;

  /** Constructor */
  public constructor(@Inject(DOCUMENT) private _document: any) {
    this.messages = new Subject<MQTTPacket>();
    this.state = new BehaviorSubject<TransportState>(TransportState.CLOSED);
  }


  /** Set up configuration */
  public configure(config?: Config): void {

    // Check for errors:
    if (this.state.getValue() !== TransportState.CLOSED) {
      throw Error('Already running!');
    }
    if (config === null && this.config === null) {
      throw Error('No configuration provided!');
    }

    // Set our configuration
    if (config != null) {
      this.config = config;
    }

    // If host isn't set, use the browser's location
    if (typeof this.config.host === 'undefined') {
      this.config.host = this._document.location.hostname;
    }
 }


  /**
   * Perform connection to broker, returning a Promise
   * which is resolved when connected.
   */
  public try_connect(): Promise<{}> {
    this.debug('try_connect');
    if (this.state.getValue() !== TransportState.CLOSED) {
      throw Error('Can\'t try_connect if not CLOSED!');
    }
    if (this.client === null) {
      throw Error('Client not configured!');
    }

    // Connecting via SSL Websocket?
    let scheme = 'ws';
    if (this.config.ssl) { scheme = 'wss'; }

    // Client options loaded from config
    const options: mqtt.IClientOptions = {
      'keepalive': this.config.keepalive,
      'reconnectPeriod': 10000,
      'clientId': 'clientid_' + Math.floor(Math.random() * 65535),
      'username': this.config.user,
      'password': this.config.pass
    };

    const url = scheme + '://' + this.config.host + ':' + this.config.port + '/' + this.config.path;

    // Create the client and listen for its connection
    this.client = mqtt.connect(url, options);

    this.client.addListener('connect', this.on_connect);
    this.client.addListener('reconnect', this.on_reconnect);
    this.client.addListener('message', this.on_message);
    this.client.addListener('offline', this.on_error);
    this.client.addListener('error', this.on_error);

    this.debug('connecting to ' + url);
    this.state.next(TransportState.TRYING);

    return new Promise(
      (resolve, reject) => this.resolvePromise = resolve
    );
  }


  /** Disconnect the client and clean up */
  public disconnect(): void {

    // Notify observers that we are disconnecting!
    this.state.next(TransportState.DISCONNECTING);

    // Disconnect. Callback will set CLOSED state
    if (this.client) {
      this.client.end(
        false,
        () => this.state.next(TransportState.CLOSED)
      );
    }
  }


  /** Send a message to all topics */
  public publish(channel: string, message?: string) {
    this.debug(`publish: [${channel}]: ${message}`);
    this.client.publish(channel, message);
  }


  /** Subscribe to server message queues */
  public subscribe(channel: string): void {
    this.debug(`subscribe: ${channel}`);
    this.client.subscribe(channel);
  }


  /**
   * Callback Functions
   *
   * Note the method signature: () => preserves lexical scope
   * if we need to use this.x inside the function
   */
  public debug(...args: any[]) {

    // Push arguments to this function into console.log
    if (console && console.log && console.log.apply) {
      console.log.apply(console, args);
    }
  }

  // Callback run on successfully connecting to server
  public on_reconnect = () => {
    this.debug('on_reconnect');
  }

  // Callback run on successfully connecting to server
  public on_connect = () => {

    this.debug('connected');

    // Indicate our connected state to observers
    this.state.next(TransportState.CONNECTED);

    this.debug(typeof this.resolvePromise);

    // Resolve our Promise to the caller
    this.resolvePromise();

    // Clear callback
    this.resolvePromise = null;
  }


  // Handle errors
  public on_error = (error: any) => {

    console.error('on_error');
    console.error(error);

    if (typeof error === 'undefined') {
      this.debug('Undefined error');
      this.state.next(TransportState.TRYING);
      return;
    }

    // Check for dropped connection and try reconnecting
    if (error.indexOf('Lost connection') !== -1) {

      // Reset state indicator
      this.state.next(TransportState.CLOSED);
    }
  }


  // On message RX, notify the Observable with the message object
  public on_message = (...args: any[]) => {

    const packet = new MQTTPacket();

    packet.topic = args[0];
    packet.message = args[1];
    packet.packet = args[2];

    // Log it to the console
    this.debug(packet);
    // this.debug(packet.messageId);

    if (packet.message.toString()) {
      this.messages.next(packet);
    } else {
      console.warn('Empty message received!');
    }
  }
}
