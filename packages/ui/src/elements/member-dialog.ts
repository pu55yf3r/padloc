import { localize as $l } from "@padlock/core/lib/locale.js";
import { Store } from "@padlock/core/lib/store.js";
import { GroupMember } from "@padlock/core/lib/group.js";
import { shared } from "../styles";
import { app } from "../init.js";
import { confirm } from "../dialog.js";
import { BaseElement, element, html, property, query, listen } from "./base.js";
import { Dialog } from "./dialog.js";
import { ToggleButton } from "./toggle-button.js";
import { LoadingButton } from "./loading-button.js";
import "./fingerprint.js";

@element("pl-member-dialog")
export class MemberDialog extends BaseElement {
    @property() store: Store | null = null;
    @property() member: GroupMember | null = null;
    @property() private _loading = false;

    @query("pl-dialog") private _dialog: Dialog;
    @query("#permRead") private _permRead: ToggleButton;
    @query("#permWrite") private _permWrite: ToggleButton;
    @query("#permManage") private _permManage: ToggleButton;
    @query("#approveButton") private _approveButton: LoadingButton;
    @query("#rejectButton") private _rejectButton: LoadingButton;

    private _resolve: (() => void) | null;

    private _done() {
        this._resolve && this._resolve();
        this._dialog.open = false;
    }

    async show(member: GroupMember, store: Store): Promise<number> {
        this.member = member;
        this.store = store;
        await this.renderComplete;
        this._permRead.active = member.permissions.read;
        this._permWrite.active = member.permissions.write;
        this._permManage.active = member.permissions.manage;
        this.requestRender();
        this._dialog.open = true;
        return new Promise<number>(resolve => {
            this._resolve = resolve;
        });
    }

    @listen("change")
    _permsChanged() {
        this.requestRender();
    }

    async _rejectMember() {
        if (!this.store!.isMember(this.member!)) {
            this._done();
            return;
        }

        if (this._loading) {
            return;
        }

        this._dialog.open = false;
        const confirmed = await confirm($l("Are you sure you want to remove this user from this group?"));
        this._dialog.open = false;

        if (!confirmed) {
            return;
        }

        this._loading = true;
        this._rejectButton.start();
        try {
            // TODO: Implement removing members
            // if (status === "active" || status === "invited") {
            //     await app.revokeAccess(this.store!, this.member!);
            // } else if (status === "requested") {
            //     await app.updateAccess(
            //         this.store!,
            //         this.member!,
            //         { read: false, write: false, manage: false },
            //         "rejected" as MemberStatus
            //     );
            // }
            this._rejectButton.success();
            this._loading = false;
            this._done();
        } catch (e) {
            this._rejectButton.fail();
            this._loading = false;
            throw e;
        }
    }

    async _approveMember() {
        if (this._loading) {
            return;
        }
        this._loading = true;
        this._approveButton.start();
        try {
            await this.store!.updateMember(this.member!, "active", {
                read: this._permRead.active,
                write: this._permWrite.active,
                manage: this._permManage.active
            });
            this._approveButton.success();
            this._loading = false;
            this._done();
        } catch (e) {
            this._approveButton.fail();
            this._loading = false;
            throw e;
        }
    }

    _shouldRender() {
        return !!this.store && !!this.member;
    }

    _render({ store, member, _loading }: this) {
        store = store!;
        member = member!;
        const storeName = store!.name;
        const { id, email, name, publicKey, permissions } = member!;
        const permsChanged =
            (this._permRead && this._permRead.active !== permissions.read) ||
            (this._permWrite && this._permWrite.active !== permissions.write) ||
            (this._permManage && this._permManage.active !== permissions.manage);
        // const isTrusted = app.isTrusted(account);
        const isOwnAccount = app.account && app.account.id === id;
        const disableControls = _loading || isOwnAccount || !store!.getPermissions().manage;
        const isMember = store.isMember(member);
        const approveIcon = isMember ? "check" : "invite";
        const approveLabel = isMember ? $l("Update") : $l("Add");
        const rejectIcon = isMember ? "removeuser" : "cancel";
        const rejectLabel = isMember ? $l("Remove") : $l("Cancel");

        return html`
        ${shared}

        <style>

            :host {
                --pl-dialog-inner: {
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                };
            }

            .header {
                padding: 20px;
                display: flex;
                align-items: center;
            }

            .email {
                font-weight: bold;
            }

            .email, .name {
                font-size: 110%;
                line-height: 30px;
                word-wrap: break-word;
                white-space: pre-wrap;
                text-align: center;
            }

            pl-fingerprint {
                --color-background: var(--color-foreground);
                color: var(--color-secondary);
                width: 100px;
                height: 100px;
                border: solid 2px var(--color-background);
                border-radius: 100%;
                margin: 30px auto 15px auto;
                box-shadow: rgba(0, 0, 0, 0.2) 0 2px 2px;
                transition: border-radius 0.3s;
            }

            pl-fingerprint:hover {
                border-radius: 5px;
            }

            pl-fingerprint:not(:hover) + .fingerprint-hint {
                visibility: hidden;
            }

            .fingerprint-hint {
                font-size: var(--font-size-micro);
                text-decoration: underline;
                text-align: center;
                margin-top: -13px;
                margin-bottom: -2px;
                text-shadow: none;
                color: var(--color-highlight);
                font-weight: bold;
            }

            .tags {
                justify-content: center;
                overflow: visible;
                margin: 20px 0;
            }

            .tag {
                background: var(--color-foreground);
                color: var(--color-highlight);
                text-shadow: none;
                box-shadow: rgba(0, 0, 0, 0.2) 0 2px 2px;
                font-size: var(--font-size-small);
                padding: 4px 16px;
            }

            .text {
                margin: 10px;
                text-align: center;
            }

            .close-icon {
                position: absolute;
                top: 0;
                right: 0;
            }

            .buttons {
                display: flex;
            }

            .permissions-label {
                font-size: var(--font-size-small);
                font-weight: bold;
                text-align: center;
            }

            .permissions {
                display: flex;
                justify-content: center;
                margin: 10px 0 20px;
                flex-wrap: wrap;
            }

            .permissions pl-toggle-button {
                --toggle-width: 33px;
                --toggle-height: 22px;
                --toggle-color-off: var(--color-secondary);
                --toggle-color-on: var(--color-primary);
                --toggle-color-knob: var(--color-tertiary);
                padding: 0 8px;
                font-weight: bold;
                font-size: var(--font-size-small);
                margin-bottom: 5px;
            }

            .remove-button {
                font-size: var(--font-size-small);
            }

        </style>

        <pl-dialog on-dialog-dismiss="${() => this._done()}">

            <div>

                <pl-icon class="close-icon tap" icon="close" on-click="${() => this._done()}"></pl-icon>

                <pl-fingerprint key="${publicKey}"></pl-fingerprint>

                <div class="fingerprint-hint">${$l("What is this?")}</div>

                <div>

                    <div class="name">${name}</div>

                    <div class="email">${email}</div>

                </div>

            </div>

            <div class="tags">
                <div class="store tag">
                    <pl-icon icon="group"></pl-icon>
                    <div>${storeName}</div>
                </div>
            </div>

            <div class="permissions-label">${$l("Permissions:")}</div>

            <div class="permissions tags">

                <pl-toggle-button
                    class="tag tap"
                    id="permRead"
                    label="${$l("read")}"
                    disabled?="${disableControls}"
                    reverse>
                </pl-toggle-button>

                <pl-toggle-button
                    class="tag tap"
                    id="permWrite"
                    label="${$l("write")}"
                    disabled?="${disableControls}"
                    reverse>
                </pl-toggle-button>

                <pl-toggle-button
                    class="tag tap"
                    id="permManage"
                    label="${$l("manage")}"
                    disabled?="${disableControls}"
                    reverse>
                </pl-toggle-button>

            </div>

            <div class="buttons tiles tiles-2">

                <pl-loading-button
                    id="approveButton"
                    disabled?="${disableControls || _loading || (isMember && !permsChanged)}"
                    on-click="${() => this._approveMember()}">

                    <pl-icon icon="${approveIcon}"></pl-icon>

                    <div>${approveLabel}</div>

                </pl-loading-button>

                <pl-loading-button
                    id="rejectButton"
                    disabled?="${disableControls || _loading}"
                    on-click="${() => this._rejectMember()}">

                    <pl-icon icon="${rejectIcon}"></pl-icon>

                    <div>${rejectLabel}</div>

                </pl-loading-button>

            </div>

        </pl-dialog>
`;
    }
}