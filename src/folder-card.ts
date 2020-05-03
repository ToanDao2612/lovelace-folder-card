import { handleClick, HomeAssistant } from 'custom-card-helpers';
import { CSSResult, customElement, html, LitElement, property, TemplateResult } from 'lit-element';
import { CARD_VERSION } from './const';
import { styles } from './styles';
import { FolderCardConfig } from './types';

console.info(
  `%c  FOLDER-CARD \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

@customElement('folder-card')
export class FolderCard extends LitElement {
  @property() private hass?: HomeAssistant;
  @property() private config?: FolderCardConfig;

  private isExpanded: boolean = false;

  private get totalFileCount(): number {
    return this.folderEntity?.attributes.file_list.length ?? 0;
  }

  private get folderEntity() {
    if (!this.config) {
      return;
    }

    return this.hass?.states[this.config!.entity];
  }

  private get files(): string[] {
    let files: string[] = this.folderEntity?.attributes.file_list;

    if (Boolean(this.config?.show_hidden) === false) {
      files = files.filter((filePath) => this.getFileName(filePath).indexOf('.') !== -1);
    }

    if (this.config?.sort) {
      files = files.sort((f1, f2) => {
        const order = f1 > f2 ? -1 : 1;
        return this.config?.sort === 'ascending' ? order * -1 : order;
      });
    }

    if (this.config?.max_count) {
      files = files.slice(0, this.config.max_count);
    }

    return files;
  }

  render(): TemplateResult | null {
    if (!this.config || !this.hass) {
      return null;
    }

    if (!this.folderEntity) {
      return this.renderWarning('The entity could not be found.');
    }

    if (!this.folderEntity.attributes.file_list) {
      return this.renderWarning("The entity you passed doesn't appear to be a folder sensor.");
    }

    if (this.files.length === 0) {
      return this.renderEmpty();
    }

    return html`
      <ha-card>
        ${this.renderHeader()}
        <div class="card-content">${this.files.map((file) => this.renderFile(file))}</div>
      </ha-card>
    `;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    if (!config.entity) {
      throw new Error('You need to set an entity');
    }

    this.config = config;
  }

  getCardSize(): number {
    return this.files.length;
  }

  private renderFile(file): TemplateResult {
    return html`
      <div class="folder-item" @click=${() => this.selectFile(file)}>
        <div class="icon-wrapper"><ha-icon icon="mdi:file"></ha-icon></div>
        <div class="item-name">${this.getFileName(file)}</div>
      </div>
    `;
  }

  private renderHeader(): TemplateResult | null {
    if (!this.config) {
      return null;
    }

    if (!this.config.title && !this.folderEntity?.attributes.friendly_name) {
      return null;
    }

    return html`
      <div class="card-header-wrapper">
        <div class="card-header">
          <div class="name">
            ${this.config.icon && html`<ha-icon class="icon" icon=${this.config.icon}></ha-icon> `}
            ${this.config.title ?? this.folderEntity!.attributes.friendly_name}
          </div>
        </div>
        ${this.config.show_count && html`<div class="count">Total: ${this.totalFileCount}</div>`}
      </div>
    `;
  }

  private renderWarning(warning: string): TemplateResult {
    return html`
      <ha-card>
        <div class="card-empty card-warning">${warning}</div>
      </ha-card>
    `;
  }

  private renderEmpty(): TemplateResult {
    return html`
      <ha-card>
        ${this.renderHeader()}
        <div class="card-empty">There are no files to show.</div>
      </ha-card>
    `;
  }

  private getFileName(file: string): string {
    return file.split('/').slice(-1)[0];
  }

  private selectFile(file): void {
    if (!this.hass) {
      return;
    }

    const actionConfig = this.buildActionConfig(file);
    handleClick(this, this.hass, actionConfig, false, false);
  }

  /**
   * Inserts a "file" parameter in service_data for a "call-service" action.
   */
  private buildActionConfig(file): object {
    let config = {
      entity: this.config?.entity,
      tap_action: Object.assign({}, this.config?.tap_action),
    };

    const fileObj = { file };

    if (config.tap_action?.action === 'call-service') {
      config.tap_action.service_data = Object.assign({}, config.tap_action.service_data, fileObj);
    }

    return config;
  }

  static get styles(): CSSResult {
    return styles;
  }
}
