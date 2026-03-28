import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const MAX_BACKOFF_SECONDS = 10;

export class KanataClient {
    constructor(host, port) {
        this._host = host;
        this._port = port;
        this._cancellable = null;
        this._connection = null;
        this._dataInputStream = null;
        this._reconnectSourceId = null;
        this._backoff = 1;
        this._layerChangeCallback = null;
        this._connectionChangeCallback = null;
    }

    onLayerChange(callback) {
        this._layerChangeCallback = callback;
    }

    onConnectionChange(callback) {
        this._connectionChangeCallback = callback;
    }

    connect() {
        this._cancellable = new Gio.Cancellable();
        this._doConnect();
    }

    disconnect() {
        if (this._reconnectSourceId) {
            GLib.source_remove(this._reconnectSourceId);
            this._reconnectSourceId = null;
        }

        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        this._closeConnection();
    }

    _doConnect() {
        const client = new Gio.SocketClient();
        client.connect_to_host_async(
            `${this._host}:${this._port}`,
            this._port,
            this._cancellable,
            (source, result) => {
                try {
                    this._connection = client.connect_to_host_finish(result);
                } catch (e) {
                    if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                        console.log(`[WhichKey] connect failed: ${e.message}`);
                        this._scheduleReconnect();
                    }
                    return;
                }

                console.log('[WhichKey] connected to kanata');
                this._backoff = 1;
                this._connectionChangeCallback?.(true);

                this._dataInputStream = new Gio.DataInputStream({
                    base_stream: this._connection.get_input_stream(),
                });

                this._readLine();
            }
        );
    }

    _readLine() {
        this._dataInputStream.read_line_async(
            GLib.PRIORITY_DEFAULT,
            this._cancellable,
            (source, result) => {
                let line;
                try {
                    [line] = this._dataInputStream.read_line_finish_utf8(result);
                } catch (e) {
                    if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                        console.log(`[WhichKey] read error: ${e.message}`);
                        this._onDisconnected();
                    }
                    return;
                }

                if (line === null) {
                    console.log('[WhichKey] connection closed by kanata');
                    this._onDisconnected();
                    return;
                }

                this._handleMessage(line);
                this._readLine();
            }
        );
    }

    _handleMessage(line) {
        let msg;
        try {
            msg = JSON.parse(line);
        } catch (e) {
            console.log(`[WhichKey] invalid JSON: ${line}`);
            return;
        }

        if (msg.LayerChange && msg.LayerChange.new) {
            this._layerChangeCallback?.(msg.LayerChange.new);
        }
    }

    _onDisconnected() {
        this._connectionChangeCallback?.(false);
        this._closeConnection();
        this._scheduleReconnect();
    }

    _closeConnection() {
        if (this._connection) {
            try {
                this._connection.close(null);
            } catch (e) {
                // already closed
            }
            this._connection = null;
        }
        this._dataInputStream = null;
    }

    _scheduleReconnect() {
        if (this._cancellable?.is_cancelled())
            return;

        console.log(`[WhichKey] reconnecting in ${this._backoff}s`);
        this._reconnectSourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            this._backoff,
            () => {
                this._reconnectSourceId = null;
                this._doConnect();
                return GLib.SOURCE_REMOVE;
            }
        );

        this._backoff = Math.min(this._backoff * 2, MAX_BACKOFF_SECONDS);
    }
}
