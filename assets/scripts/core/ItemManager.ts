import { Color, Graphics, Label, Layers, Node, Size, Tween, tween, UIOpacity, UITransform, Vec3 } from "cc";
import { ITEM_COLOR_MAP, ItemType, SpecialType } from "../data/LevelData";
import { PoolUtil } from "../util/PoolUtil";

type ItemShape =
  | "circle"
  | "triangle"
  | "diamond"
  | "star"
  | "hexagon"
  | "pentagon"
  | "square"
  | "octagon"
  | "sun"
  | "oval"
  | "plus"
  | "heart"
  | "shield"
  | "teardrop"
  | "flower"
  | "crown"
  | "arrow"
  | "clover"
  | "crescent"
  | "cloud"
  | "leaf"
  | "gem";

interface ShapePoint {
  x: number;
  y: number;
}

const ITEM_SHAPE_MAP: Record<ItemType, ItemShape> = {
  [ItemType.Red]: "square",
  [ItemType.Yellow]: "circle",
  [ItemType.Blue]: "triangle",
  [ItemType.Green]: "diamond",
  [ItemType.Purple]: "star",
  [ItemType.Orange]: "hexagon",
  [ItemType.Pink]: "pentagon",
  [ItemType.Cyan]: "heart",
  [ItemType.Lime]: "sun",
  [ItemType.Teal]: "plus",
  [ItemType.Indigo]: "shield",
  [ItemType.Magenta]: "leaf",
  [ItemType.Gold]: "flower",
  [ItemType.Coral]: "crown",
  [ItemType.Mint]: "teardrop",
  [ItemType.Azure]: "oval",
  [ItemType.Rose]: "arrow",
  [ItemType.Amber]: "cloud",
  [ItemType.Violet]: "octagon",
  [ItemType.Pearl]: "gem",
};

interface BrandLogoConfig {
  text: string;
  textColor: Color;
  badgeColor: Color;
  ringColor: Color;
  country:
    | "china"
    | "usa"
    | "japan"
    | "uk"
    | "germany"
    | "france"
    | "italy"
    | "canada"
    | "brazil"
    | "korea"
    | "india"
    | "spain"
    | "sweden"
    | "switzerland"
    | "australia"
    | "russia"
    | "mexico"
    | "argentina"
    | "southAfrica"
    | "turkey";
  brand:
    | "tesla"
    | "bmw"
    | "audi"
    | "benz"
    | "toyota"
    | "honda"
    | "ford"
    | "vw"
    | "byd"
    | "nio"
    | "xpeng"
    | "li"
    | "geely"
    | "volvo"
    | "mini"
    | "mazda"
    | "kia"
    | "hyundai"
    | "porsche"
    | "jeep";
}

const BRAND_LOGO_MAP: Record<ItemType, BrandLogoConfig> = {
  [ItemType.Red]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(222, 41, 16, 255),
    ringColor: new Color(255, 225, 96, 235),
    country: "china",
    brand: "tesla",
  },
  [ItemType.Yellow]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(60, 59, 110, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "usa",
    brand: "bmw",
  },
  [ItemType.Blue]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(255, 255, 255, 255),
    ringColor: new Color(188, 0, 45, 235),
    country: "japan",
    brand: "audi",
  },
  [ItemType.Green]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(1, 33, 105, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "uk",
    brand: "benz",
  },
  [ItemType.Purple]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 0, 0, 255),
    ringColor: new Color(255, 206, 0, 235),
    country: "germany",
    brand: "toyota",
  },
  [ItemType.Orange]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 85, 164, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "france",
    brand: "honda",
  },
  [ItemType.Pink]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 146, 70, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "italy",
    brand: "ford",
  },
  [ItemType.Cyan]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(255, 255, 255, 255),
    ringColor: new Color(255, 0, 0, 235),
    country: "canada",
    brand: "vw",
  },
  [ItemType.Lime]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 156, 59, 255),
    ringColor: new Color(255, 223, 0, 235),
    country: "brazil",
    brand: "byd",
  },
  [ItemType.Teal]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(255, 255, 255, 255),
    ringColor: new Color(0, 71, 160, 235),
    country: "korea",
    brand: "nio",
  },
  [ItemType.Indigo]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(255, 153, 51, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "india",
    brand: "xpeng",
  },
  [ItemType.Magenta]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(198, 11, 30, 255),
    ringColor: new Color(255, 196, 0, 235),
    country: "spain",
    brand: "li",
  },
  [ItemType.Gold]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 106, 167, 255),
    ringColor: new Color(254, 204, 0, 235),
    country: "sweden",
    brand: "geely",
  },
  [ItemType.Coral]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(213, 43, 30, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "switzerland",
    brand: "volvo",
  },
  [ItemType.Mint]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 48, 135, 255),
    ringColor: new Color(255, 255, 255, 225),
    country: "australia",
    brand: "mini",
  },
  [ItemType.Azure]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(255, 255, 255, 255),
    ringColor: new Color(0, 57, 166, 235),
    country: "russia",
    brand: "mazda",
  },
  [ItemType.Rose]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 104, 71, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "mexico",
    brand: "kia",
  },
  [ItemType.Amber]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(116, 172, 223, 255),
    ringColor: new Color(255, 255, 255, 235),
    country: "argentina",
    brand: "hyundai",
  },
  [ItemType.Violet]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(0, 119, 73, 255),
    ringColor: new Color(255, 182, 18, 235),
    country: "southAfrica",
    brand: "porsche",
  },
  [ItemType.Pearl]: {
    text: "",
    textColor: new Color(255, 255, 255, 0),
    badgeColor: new Color(227, 10, 23, 255),
    ringColor: new Color(255, 255, 255, 240),
    country: "turkey",
    brand: "jeep",
  },
};

export class ItemManager {
  constructor(private readonly poolUtil: PoolUtil) {}

  createItemNode(itemType: ItemType, specialType: SpecialType, size: number): Node {
    const node = this.poolUtil.getNode("match-item", () => new Node("MatchItem"));
    node.layer = Layers.Enum.UI_2D;
    node.active = true;
    node.scale = Vec3.ONE.clone();

    const visualSize = this.getCrispVisualSize(size);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(new Size(visualSize, visualSize));
    const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    opacity.opacity = 255;

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    const label = node.getChildByName("Symbol") ?? this.createSymbolNode(node, visualSize);
    const brandLabelNode = node.getChildByName("BrandMark") ?? this.createBrandMarkNode(node, visualSize);
    const fxNode = node.getChildByName("SpecialFx") ?? this.createSpecialFxNode(node, visualSize);
    this.resizeChild(label, visualSize - 10, visualSize - 10);
    this.resizeChild(brandLabelNode, visualSize - 12, visualSize - 12);
    const symbolLabel = label.getComponent(Label)!;
    const brandLabel = brandLabelNode.getComponent(Label)!;

    this.drawItem(graphics, itemType, specialType, visualSize);
    this.updateBrandMark(brandLabel, itemType, visualSize);
    this.hideScoreMark(node);
    this.updateSpecialFx(fxNode, specialType, visualSize);
    brandLabelNode.setSiblingIndex(Math.max(0, node.children.length - 3));
    fxNode.setSiblingIndex(Math.max(0, node.children.length - 2));
    label.setSiblingIndex(Math.max(0, node.children.length - 1));
    symbolLabel.string = this.getSpecialSymbol(specialType);
    symbolLabel.color = specialType === SpecialType.None ? new Color(0, 0, 0, 0) : new Color(255, 255, 255, 240);
    return node;
  }

  updateItemNode(node: Node, itemType: ItemType, specialType: SpecialType, size: number): void {
    const visualSize = this.getCrispVisualSize(size);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(new Size(visualSize, visualSize));
    const graphics = node.getComponent(Graphics)!;
    const labelNode = node.getChildByName("Symbol");
    const label = labelNode?.getComponent(Label);
    const brandLabelNode = node.getChildByName("BrandMark") ?? this.createBrandMarkNode(node, visualSize);
    const brandLabel = brandLabelNode.getComponent(Label);
    const fxNode = node.getChildByName("SpecialFx") ?? this.createSpecialFxNode(node, visualSize);
    if (labelNode) {
      this.resizeChild(labelNode, visualSize - 10, visualSize - 10);
    }
    this.resizeChild(brandLabelNode, visualSize - 12, visualSize - 12);
    this.drawItem(graphics, itemType, specialType, visualSize);
    if (brandLabel) {
      this.updateBrandMark(brandLabel, itemType, visualSize);
    }
    this.hideScoreMark(node);
    this.updateSpecialFx(fxNode, specialType, visualSize);
    node.getChildByName("BrandMark")?.setSiblingIndex(Math.max(0, node.children.length - 3));
    fxNode.setSiblingIndex(Math.max(0, node.children.length - 2));
    node.getChildByName("Symbol")?.setSiblingIndex(Math.max(0, node.children.length - 1));
    if (label) {
      label.string = this.getSpecialSymbol(specialType);
      label.color = specialType === SpecialType.None ? new Color(0, 0, 0, 0) : new Color(255, 255, 255, 240);
    }
    const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    opacity.opacity = 255;
    node.scale = Vec3.ONE.clone();
  }

  private getCrispVisualSize(size: number): number {
    return Math.max(24, Math.round(size * 0.98));
  }

  private resizeChild(node: Node, width: number, height: number): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(new Size(Math.max(width, 1), Math.max(height, 1)));
  }

  recycleItemNode(node: Node): void {
    this.resetSpecialFx(node.getChildByName("SpecialFx") ?? null);
    this.poolUtil.putNode("match-item", node);
  }

  private createBrandMarkNode(parent: Node, size: number): Node {
    const node = new Node("BrandMark");
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(new Vec3(0, 0, 0));

    const transform = node.addComponent(UITransform);
    transform.setContentSize(new Size(size - 12, size - 12));

    const label = node.addComponent(Label);
    label.isBold = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return node;
  }

  private createSymbolNode(parent: Node, size: number): Node {
    const node = new Node("Symbol");
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(new Vec3(0, 0, 0));

    const transform = node.addComponent(UITransform);
    transform.setContentSize(new Size(size - 10, size - 10));

    const label = node.addComponent(Label);
    label.fontSize = 24;
    label.isBold = true;
    label.lineHeight = 28;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    return node;
  }

  private updateBrandMark(label: Label, itemType: ItemType, size: number): void {
    label.string = "";
    label.color = new Color(255, 255, 255, 0);
    label.fontSize = Math.max(12, Math.floor(size * 0.2));
    label.lineHeight = label.fontSize + 6;
    label.node.setPosition(new Vec3(0, 0, 0));
  }

  private hideScoreMark(parent: Node): void {
    const scoreMark = parent.getChildByName("ScoreMark");
    if (!scoreMark) {
      return;
    }
    const label = scoreMark.getComponent(Label);
    if (label) {
      label.string = "";
    }
    scoreMark.active = false;
  }

  private createSpecialFxNode(parent: Node, size: number): Node {
    const node = new Node("SpecialFx");
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(new Vec3(0, 0, 0));

    const transform = node.addComponent(UITransform);
    transform.setContentSize(new Size(size + 14, size + 14));
    node.addComponent(Graphics);
    node.addComponent(UIOpacity);
    node.active = false;
    return node;
  }

  private createRotatingHaloNode(parent: Node, size: number): Node {
    const node = new Node("RotatingHalo");
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(new Vec3(0, 0, 0));

    const transform = node.addComponent(UITransform);
    transform.setContentSize(new Size(size + 20, size + 20));
    node.addComponent(Graphics);
    node.addComponent(UIOpacity);
    node.active = false;
    return node;
  }

  private drawItem(graphics: Graphics, itemType: ItemType, specialType: SpecialType, size: number): void {
    const baseColor = specialType === SpecialType.Rainbow ? new Color(255, 255, 255, 255) : ITEM_COLOR_MAP[itemType];
    const strokeColor = specialType === SpecialType.Rainbow ? new Color(255, 178, 255, 255) : this.enhance(baseColor, 54);
    const shape = ITEM_SHAPE_MAP[itemType];
    const shadowColor = new Color(8, 14, 30, 96);
    const highlightColor = new Color(255, 255, 255, 58);
    const innerColor =
      specialType === SpecialType.Rainbow
        ? new Color(255, 229, 255, 144)
        : this.enhance(baseColor, 18, Math.min(baseColor.a + 10, 255));

    graphics.clear();

    graphics.fillColor = shadowColor;
    this.traceShape(graphics, shape, size * 1.02, -2);
    graphics.fill();

    graphics.fillColor = baseColor;
    this.traceShape(graphics, shape, size * 0.98, 0);
    graphics.fill();

    graphics.strokeColor = strokeColor;
    graphics.lineWidth = Math.max(4, size * 0.085);
    this.traceShape(graphics, shape, size * 0.98, 0);
    graphics.stroke();

    graphics.fillColor = innerColor;
    this.traceShape(graphics, shape, size * 0.46, 2);
    graphics.fill();

    graphics.fillColor = highlightColor;
    this.traceShape(graphics, shape, size * 0.22, size * 0.18);
    graphics.fill();
  }

  private drawFlagTile(graphics: Graphics, size: number, tileColor: Color, ringColor: Color): void {
    graphics.fillColor = new Color(8, 14, 30, 78);
    graphics.roundRect(-size * 0.45, -size * 0.42, size * 0.9, size * 0.86, size * 0.18);
    graphics.fill();

    graphics.fillColor = new Color(18, 24, 48, 250);
    graphics.roundRect(-size * 0.43, -size * 0.43, size * 0.86, size * 0.86, size * 0.18);
    graphics.fill();

    graphics.strokeColor = ringColor;
    graphics.lineWidth = 3.5;
    graphics.roundRect(-size * 0.43, -size * 0.43, size * 0.86, size * 0.86, size * 0.18);
    graphics.stroke();

    graphics.fillColor = new Color(tileColor.r, tileColor.g, tileColor.b, 58);
    graphics.roundRect(-size * 0.35, size * 0.08, size * 0.7, size * 0.22, size * 0.11);
    graphics.fill();
  }

  private drawCountryFlag(graphics: Graphics, country: BrandLogoConfig["country"], size: number): void {
    const width = size * 0.68;
    const height = size * 0.44;
    const x = -width / 2;
    const y = -height / 2;

    graphics.fillColor = new Color(255, 255, 255, 255);
    graphics.roundRect(x, y, width, height, size * 0.06);
    graphics.fill();

    switch (country) {
      case "china":
        this.drawChinaFlag(graphics, x, y, width, height);
        break;
      case "usa":
        this.drawUsaFlag(graphics, x, y, width, height);
        break;
      case "japan":
        this.drawJapanFlag(graphics, x, y, width, height);
        break;
      case "uk":
        this.drawUkFlag(graphics, x, y, width, height);
        break;
      case "germany":
        this.drawHorizontalFlag(graphics, x, y, width, height, [
          new Color(0, 0, 0, 255),
          new Color(221, 0, 0, 255),
          new Color(255, 206, 0, 255),
        ]);
        break;
      case "france":
        this.drawVerticalFlag(graphics, x, y, width, height, [
          new Color(0, 85, 164, 255),
          new Color(255, 255, 255, 255),
          new Color(239, 65, 53, 255),
        ]);
        break;
      case "italy":
        this.drawVerticalFlag(graphics, x, y, width, height, [
          new Color(0, 146, 70, 255),
          new Color(255, 255, 255, 255),
          new Color(206, 43, 55, 255),
        ]);
        break;
      case "canada":
        this.drawCanadaFlag(graphics, x, y, width, height);
        break;
      case "brazil":
        this.drawBrazilFlag(graphics, x, y, width, height);
        break;
      case "korea":
        this.drawKoreaFlag(graphics, x, y, width, height);
        break;
      case "india":
        this.drawIndiaFlag(graphics, x, y, width, height);
        break;
      case "spain":
        this.drawSpainFlag(graphics, x, y, width, height);
        break;
      case "sweden":
        this.drawNordicFlag(graphics, x, y, width, height, new Color(0, 106, 167, 255), new Color(254, 204, 0, 255));
        break;
      case "switzerland":
        this.drawSwissFlag(graphics, x, y, width, height);
        break;
      case "australia":
        this.drawAustraliaFlag(graphics, x, y, width, height);
        break;
      case "russia":
        this.drawHorizontalFlag(graphics, x, y, width, height, [
          new Color(255, 255, 255, 255),
          new Color(0, 57, 166, 255),
          new Color(213, 43, 30, 255),
        ]);
        break;
      case "mexico":
        this.drawMexicoFlag(graphics, x, y, width, height);
        break;
      case "argentina":
        this.drawArgentinaFlag(graphics, x, y, width, height);
        break;
      case "southAfrica":
        this.drawSouthAfricaFlag(graphics, x, y, width, height);
        break;
      case "turkey":
        this.drawTurkeyFlag(graphics, x, y, width, height);
        break;
      default:
        break;
    }

    graphics.strokeColor = new Color(255, 255, 255, 190);
    graphics.lineWidth = 2;
    graphics.roundRect(x, y, width, height, size * 0.06);
    graphics.stroke();
  }

  private drawHorizontalFlag(graphics: Graphics, x: number, y: number, width: number, height: number, colors: Color[]): void {
    const stripeHeight = height / colors.length;
    colors.forEach((color, index) => {
      graphics.fillColor = color;
      graphics.rect(x, y + height - stripeHeight * (index + 1), width, stripeHeight);
      graphics.fill();
    });
  }

  private drawVerticalFlag(graphics: Graphics, x: number, y: number, width: number, height: number, colors: Color[]): void {
    const stripeWidth = width / colors.length;
    colors.forEach((color, index) => {
      graphics.fillColor = color;
      graphics.rect(x + stripeWidth * index, y, stripeWidth, height);
      graphics.fill();
    });
  }

  private drawChinaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(222, 41, 16, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = new Color(255, 222, 0, 255);
    this.traceStar(graphics, x + width * 0.22, y + height * 0.68, height * 0.16, height * 0.07);
    graphics.fill();
    for (let i = 0; i < 4; i += 1) {
      graphics.circle(x + width * (0.38 + i * 0.08), y + height * (0.76 - i * 0.11), height * 0.035);
      graphics.fill();
    }
  }

  private drawUsaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    const stripeHeight = height / 7;
    for (let i = 0; i < 7; i += 1) {
      graphics.fillColor = i % 2 === 0 ? new Color(178, 34, 52, 255) : new Color(255, 255, 255, 255);
      graphics.rect(x, y + i * stripeHeight, width, stripeHeight);
      graphics.fill();
    }
    graphics.fillColor = new Color(60, 59, 110, 255);
    graphics.rect(x, y + height - stripeHeight * 4, width * 0.42, stripeHeight * 4);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 255);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        graphics.circle(x + width * (0.08 + col * 0.09), y + height * (0.75 + row * 0.08), height * 0.018);
        graphics.fill();
      }
    }
  }

  private drawJapanFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(255, 255, 255, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = new Color(188, 0, 45, 255);
    graphics.circle(x + width / 2, y + height / 2, height * 0.24);
    graphics.fill();
  }

  private drawUkFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(1, 33, 105, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 255);
    graphics.lineWidth = height * 0.22;
    this.drawDiagonalCross(graphics, x, y, width, height);
    graphics.strokeColor = new Color(200, 16, 46, 255);
    graphics.lineWidth = height * 0.1;
    this.drawDiagonalCross(graphics, x, y, width, height);
    graphics.fillColor = new Color(255, 255, 255, 255);
    graphics.rect(x, y + height * 0.38, width, height * 0.24);
    graphics.fill();
    graphics.rect(x + width * 0.39, y, width * 0.22, height);
    graphics.fill();
    graphics.fillColor = new Color(200, 16, 46, 255);
    graphics.rect(x, y + height * 0.43, width, height * 0.14);
    graphics.fill();
    graphics.rect(x + width * 0.44, y, width * 0.12, height);
    graphics.fill();
  }

  private drawDiagonalCross(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.moveTo(x, y);
    graphics.lineTo(x + width, y + height);
    graphics.stroke();
    graphics.moveTo(x, y + height);
    graphics.lineTo(x + width, y);
    graphics.stroke();
  }

  private drawCanadaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    this.drawVerticalFlag(graphics, x, y, width, height, [
      new Color(255, 0, 0, 255),
      new Color(255, 255, 255, 255),
      new Color(255, 0, 0, 255),
    ]);
    graphics.fillColor = new Color(255, 0, 0, 255);
    this.traceStar(graphics, x + width / 2, y + height * 0.5, height * 0.2, height * 0.08);
    graphics.fill();
  }

  private drawBrazilFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(0, 156, 59, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = new Color(255, 223, 0, 255);
    this.tracePolygon(graphics, [
      { x: x + width * 0.5, y: y + height * 0.86 },
      { x: x + width * 0.86, y: y + height * 0.5 },
      { x: x + width * 0.5, y: y + height * 0.14 },
      { x: x + width * 0.14, y: y + height * 0.5 },
    ]);
    graphics.fill();
    graphics.fillColor = new Color(0, 39, 118, 255);
    graphics.circle(x + width / 2, y + height / 2, height * 0.19);
    graphics.fill();
  }

  private drawKoreaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(255, 255, 255, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = new Color(205, 46, 58, 255);
    graphics.circle(x + width / 2, y + height / 2 + height * 0.05, height * 0.16);
    graphics.fill();
    graphics.fillColor = new Color(0, 71, 160, 255);
    graphics.circle(x + width / 2, y + height / 2 - height * 0.05, height * 0.16);
    graphics.fill();
    graphics.strokeColor = new Color(0, 0, 0, 255);
    graphics.lineWidth = 2;
    this.drawFlagLineBars(graphics, x, y, width, height);
  }

  private drawFlagLineBars(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    const spots = [
      [x + width * 0.18, y + height * 0.75],
      [x + width * 0.82, y + height * 0.75],
      [x + width * 0.18, y + height * 0.25],
      [x + width * 0.82, y + height * 0.25],
    ];
    spots.forEach(([cx, cy]) => {
      graphics.moveTo(cx - width * 0.06, cy);
      graphics.lineTo(cx + width * 0.06, cy);
      graphics.stroke();
      graphics.moveTo(cx - width * 0.06, cy + height * 0.05);
      graphics.lineTo(cx + width * 0.06, cy + height * 0.05);
      graphics.stroke();
    });
  }

  private drawIndiaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    this.drawHorizontalFlag(graphics, x, y, width, height, [
      new Color(255, 153, 51, 255),
      new Color(255, 255, 255, 255),
      new Color(19, 136, 8, 255),
    ]);
    graphics.strokeColor = new Color(0, 0, 128, 255);
    graphics.lineWidth = 2;
    graphics.circle(x + width / 2, y + height / 2, height * 0.11);
    graphics.stroke();
  }

  private drawSpainFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(198, 11, 30, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = new Color(255, 196, 0, 255);
    graphics.rect(x, y + height * 0.25, width, height * 0.5);
    graphics.fill();
  }

  private drawNordicFlag(graphics: Graphics, x: number, y: number, width: number, height: number, bg: Color, cross: Color): void {
    graphics.fillColor = bg;
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = cross;
    graphics.rect(x, y + height * 0.4, width, height * 0.2);
    graphics.fill();
    graphics.rect(x + width * 0.32, y, width * 0.16, height);
    graphics.fill();
  }

  private drawSwissFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(213, 43, 30, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 255);
    graphics.rect(x + width * 0.41, y + height * 0.22, width * 0.18, height * 0.56);
    graphics.fill();
    graphics.rect(x + width * 0.28, y + height * 0.41, width * 0.44, height * 0.18);
    graphics.fill();
  }

  private drawAustraliaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(0, 48, 135, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    this.drawUkFlag(graphics, x, y + height * 0.5, width * 0.46, height * 0.5);
    graphics.fillColor = new Color(255, 255, 255, 255);
    this.traceStar(graphics, x + width * 0.72, y + height * 0.56, height * 0.12, height * 0.05);
    graphics.fill();
    graphics.circle(x + width * 0.62, y + height * 0.26, height * 0.04);
    graphics.fill();
  }

  private drawMexicoFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    this.drawVerticalFlag(graphics, x, y, width, height, [
      new Color(0, 104, 71, 255),
      new Color(255, 255, 255, 255),
      new Color(206, 17, 38, 255),
    ]);
    graphics.fillColor = new Color(196, 135, 45, 255);
    graphics.circle(x + width / 2, y + height / 2, height * 0.08);
    graphics.fill();
  }

  private drawArgentinaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    this.drawHorizontalFlag(graphics, x, y, width, height, [
      new Color(116, 172, 223, 255),
      new Color(255, 255, 255, 255),
      new Color(116, 172, 223, 255),
    ]);
    graphics.fillColor = new Color(246, 180, 14, 255);
    graphics.circle(x + width / 2, y + height / 2, height * 0.08);
    graphics.fill();
  }

  private drawSouthAfricaFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(222, 56, 49, 255);
    graphics.rect(x, y + height / 2, width, height / 2);
    graphics.fill();
    graphics.fillColor = new Color(0, 35, 149, 255);
    graphics.rect(x, y, width, height / 2);
    graphics.fill();
    graphics.fillColor = new Color(0, 119, 73, 255);
    this.tracePolygon(graphics, [
      { x, y: y + height },
      { x: x + width * 0.54, y: y + height * 0.5 },
      { x, y },
      { x, y: y + height * 0.26 },
      { x: x + width * 0.33, y: y + height * 0.5 },
      { x, y: y + height * 0.74 },
    ]);
    graphics.fill();
    graphics.fillColor = new Color(255, 182, 18, 255);
    this.tracePolygon(graphics, [
      { x, y: y + height },
      { x: x + width * 0.22, y: y + height * 0.5 },
      { x, y },
    ]);
    graphics.fill();
    graphics.fillColor = new Color(0, 0, 0, 255);
    this.tracePolygon(graphics, [
      { x, y: y + height * 0.82 },
      { x: x + width * 0.16, y: y + height * 0.5 },
      { x, y: y + height * 0.18 },
    ]);
    graphics.fill();
  }

  private drawTurkeyFlag(graphics: Graphics, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = new Color(227, 10, 23, 255);
    graphics.rect(x, y, width, height);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 255);
    graphics.circle(x + width * 0.42, y + height * 0.5, height * 0.18);
    graphics.fill();
    graphics.fillColor = new Color(227, 10, 23, 255);
    graphics.circle(x + width * 0.47, y + height * 0.5, height * 0.145);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 255);
    this.traceStar(graphics, x + width * 0.62, y + height * 0.5, height * 0.09, height * 0.04);
    graphics.fill();
  }

  private traceStar(graphics: Graphics, centerX: number, centerY: number, outerRadius: number, innerRadius: number): void {
    for (let i = 0; i <= 10; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (Math.PI * i) / 5;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.close();
  }

  private drawCarBrandLogo(graphics: Graphics, brand: BrandLogoConfig, size: number): void {
    switch (brand.brand) {
      case "tesla":
        this.drawTeslaLogo(graphics, size, brand);
        break;
      case "bmw":
        this.drawBmwLogo(graphics, size, brand);
        break;
      case "audi":
        this.drawAudiLogo(graphics, size, brand);
        break;
      case "benz":
        this.drawMercedesLogo(graphics, size, brand);
        break;
      case "toyota":
        this.drawToyotaLogo(graphics, size, brand);
        break;
      case "honda":
        this.drawHondaLogo(graphics, size, brand);
        break;
      case "ford":
      case "byd":
      case "kia":
      case "mini":
      case "jeep":
        this.drawWordLogo(graphics, size, brand);
        break;
      case "vw":
        this.drawVwLogo(graphics, size, brand);
        break;
      case "nio":
        this.drawNioLogo(graphics, size, brand);
        break;
      case "xpeng":
        this.drawXpengLogo(graphics, size, brand);
        break;
      case "li":
        this.drawLiLogo(graphics, size, brand);
        break;
      case "geely":
        this.drawGeelyLogo(graphics, size, brand);
        break;
      case "volvo":
        this.drawVolvoLogo(graphics, size, brand);
        break;
      case "mazda":
        this.drawMazdaLogo(graphics, size, brand);
        break;
      case "hyundai":
        this.drawHyundaiLogo(graphics, size, brand);
        break;
      case "porsche":
        this.drawPorscheLogo(graphics, size, brand);
        break;
      default:
        this.drawWordLogo(graphics, size, brand);
        break;
    }
  }

  private drawTeslaLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    graphics.moveTo(-size * 0.26, size * 0.24);
    graphics.quadraticCurveTo(0, size * 0.36, size * 0.26, size * 0.24);
    graphics.stroke();

    graphics.fillColor = brand.badgeColor;
    this.traceRoundedPolygon(
      graphics,
      [
        { x: -size * 0.08, y: size * 0.24 },
        { x: size * 0.08, y: size * 0.24 },
        { x: size * 0.03, y: -size * 0.28 },
        { x: 0, y: -size * 0.38 },
        { x: -size * 0.03, y: -size * 0.28 },
      ],
      size * 0.03,
    );
    graphics.fill();
  }

  private drawBmwLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    const radius = size * 0.34;
    graphics.fillColor = new Color(20, 24, 34, 255);
    graphics.circle(0, 0, radius);
    graphics.fill();

    graphics.fillColor = new Color(72, 166, 244, 255);
    graphics.moveTo(0, 0);
    graphics.lineTo(0, radius * 0.72);
    graphics.lineTo(radius * 0.72, radius * 0.72);
    graphics.lineTo(radius * 0.72, 0);
    graphics.close();
    graphics.fill();
    graphics.moveTo(0, 0);
    graphics.lineTo(0, -radius * 0.72);
    graphics.lineTo(-radius * 0.72, -radius * 0.72);
    graphics.lineTo(-radius * 0.72, 0);
    graphics.close();
    graphics.fill();

    graphics.fillColor = new Color(244, 247, 255, 255);
    graphics.moveTo(0, 0);
    graphics.lineTo(0, radius * 0.72);
    graphics.lineTo(-radius * 0.72, radius * 0.72);
    graphics.lineTo(-radius * 0.72, 0);
    graphics.close();
    graphics.fill();
    graphics.moveTo(0, 0);
    graphics.lineTo(0, -radius * 0.72);
    graphics.lineTo(radius * 0.72, -radius * 0.72);
    graphics.lineTo(radius * 0.72, 0);
    graphics.close();
    graphics.fill();

    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    graphics.circle(0, 0, radius);
    graphics.stroke();
  }

  private drawAudiLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    for (let i = 0; i < 4; i += 1) {
      graphics.circle((i - 1.5) * size * 0.18, 0, size * 0.15);
      graphics.stroke();
    }
  }

  private drawMercedesLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    const radius = size * 0.32;
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    graphics.circle(0, 0, radius);
    graphics.stroke();

    graphics.strokeColor = new Color(245, 250, 255, 255);
    graphics.lineWidth = 4.6;
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 3;
      graphics.moveTo(0, 0);
      graphics.lineTo(Math.cos(angle) * radius * 0.78, Math.sin(angle) * radius * 0.78);
      graphics.stroke();
    }
  }

  private drawToyotaLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    this.traceRoundedPolygon(graphics, this.buildEllipsePoints(size * 0.36, size * 0.22, 0, 22), size * 0.04);
    graphics.stroke();
    this.traceRoundedPolygon(graphics, this.buildEllipsePoints(size * 0.11, size * 0.28, 0, 18), size * 0.03);
    graphics.stroke();
    this.traceRoundedPolygon(graphics, this.buildEllipsePoints(size * 0.24, size * 0.1, size * 0.04, 18), size * 0.02);
    graphics.stroke();
  }

  private drawHondaLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    graphics.roundRect(-size * 0.28, -size * 0.34, size * 0.56, size * 0.68, size * 0.08);
    graphics.stroke();
  }

  private drawWordLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.fillColor = brand.badgeColor;
    graphics.roundRect(-size * 0.34, -size * 0.19, size * 0.68, size * 0.38, size * 0.19);
    graphics.fill();
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 3;
    graphics.roundRect(-size * 0.34, -size * 0.19, size * 0.68, size * 0.38, size * 0.19);
    graphics.stroke();
  }

  private drawVwLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    const radius = size * 0.34;
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    graphics.circle(0, 0, radius);
    graphics.stroke();
  }

  private drawNioLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    graphics.moveTo(-size * 0.3, -size * 0.06);
    graphics.quadraticCurveTo(0, size * 0.32, size * 0.3, -size * 0.06);
    graphics.stroke();
    graphics.moveTo(-size * 0.29, -size * 0.15);
    graphics.lineTo(0, -size * 0.32);
    graphics.lineTo(size * 0.29, -size * 0.15);
    graphics.stroke();
  }

  private drawXpengLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 5;
    graphics.moveTo(-size * 0.28, size * 0.28);
    graphics.lineTo(size * 0.28, -size * 0.28);
    graphics.stroke();
    graphics.moveTo(size * 0.28, size * 0.28);
    graphics.lineTo(-size * 0.28, -size * 0.28);
    graphics.stroke();
  }

  private drawLiLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.fillColor = brand.badgeColor;
    graphics.roundRect(-size * 0.28, -size * 0.28, size * 0.56, size * 0.56, size * 0.12);
    graphics.fill();
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 3;
    graphics.roundRect(-size * 0.28, -size * 0.28, size * 0.56, size * 0.56, size * 0.12);
    graphics.stroke();
  }

  private drawGeelyLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 3;
    this.traceRoundedPolygon(
      graphics,
      [
        { x: -size * 0.32, y: size * 0.26 },
        { x: size * 0.32, y: size * 0.26 },
        { x: size * 0.26, y: -size * 0.25 },
        { x: 0, y: -size * 0.38 },
        { x: -size * 0.26, y: -size * 0.25 },
      ],
      size * 0.08,
    );
    graphics.stroke();
    const colors = [new Color(45, 111, 220, 255), new Color(24, 42, 104, 255), new Color(190, 52, 68, 255)];
    colors.forEach((color, index) => {
      graphics.fillColor = color;
      graphics.roundRect(-size * 0.25 + index * size * 0.17, -size * 0.08, size * 0.13, size * 0.16, size * 0.03);
      graphics.fill();
    });
  }

  private drawVolvoLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    const radius = size * 0.26;
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    graphics.circle(0, 0, radius);
    graphics.stroke();
    graphics.moveTo(radius * 0.58, radius * 0.58);
    graphics.lineTo(size * 0.34, size * 0.34);
    graphics.stroke();
    graphics.moveTo(size * 0.34, size * 0.34);
    graphics.lineTo(size * 0.18, size * 0.34);
    graphics.stroke();
    graphics.moveTo(size * 0.34, size * 0.34);
    graphics.lineTo(size * 0.34, size * 0.18);
    graphics.stroke();
  }

  private drawMazdaLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    this.traceRoundedPolygon(graphics, this.buildEllipsePoints(size * 0.35, size * 0.27, 0, 20), size * 0.05);
    graphics.stroke();
    graphics.moveTo(-size * 0.22, size * 0.04);
    graphics.quadraticCurveTo(0, -size * 0.28, size * 0.22, size * 0.04);
    graphics.stroke();
    graphics.moveTo(-size * 0.22, size * 0.04);
    graphics.quadraticCurveTo(0, size * 0.24, size * 0.22, size * 0.04);
    graphics.stroke();
  }

  private drawHyundaiLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 4;
    this.traceRoundedPolygon(graphics, this.buildEllipsePoints(size * 0.36, size * 0.22, 0, 20), size * 0.05);
    graphics.stroke();
  }

  private drawPorscheLogo(graphics: Graphics, size: number, brand: BrandLogoConfig): void {
    graphics.fillColor = brand.badgeColor;
    this.traceRoundedPolygon(
      graphics,
      [
        { x: -size * 0.27, y: size * 0.35 },
        { x: size * 0.27, y: size * 0.35 },
        { x: size * 0.23, y: -size * 0.2 },
        { x: 0, y: -size * 0.38 },
        { x: -size * 0.23, y: -size * 0.2 },
      ],
      size * 0.07,
    );
    graphics.fill();
    graphics.strokeColor = brand.ringColor;
    graphics.lineWidth = 3;
    this.traceRoundedPolygon(
      graphics,
      [
        { x: -size * 0.27, y: size * 0.35 },
        { x: size * 0.27, y: size * 0.35 },
        { x: size * 0.23, y: -size * 0.2 },
        { x: 0, y: -size * 0.38 },
        { x: -size * 0.23, y: -size * 0.2 },
      ],
      size * 0.07,
    );
    graphics.stroke();
  }

  private getSpecialSymbol(specialType: SpecialType): string {
    switch (specialType) {
      case SpecialType.Horizontal:
        return "━";
      case SpecialType.Vertical:
        return "┃";
      case SpecialType.Bomb:
        return "●";
      case SpecialType.Rainbow:
        return "◎";
      default:
        return "";
    }
  }

  private updateSpecialFx(node: Node, specialType: SpecialType, size: number): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(new Size(size + 14, size + 14));

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    const haloNode = node.getChildByName("RotatingHalo") ?? this.createRotatingHaloNode(node, size);

    this.resetSpecialFx(node);
    graphics.clear();

    if (specialType === SpecialType.None) {
      return;
    }

    node.active = true;
    opacity.opacity = 220;

    switch (specialType) {
      case SpecialType.Horizontal:
        this.drawHorizontalFx(graphics, size);
        this.drawRotatingHalo(haloNode, size, false);
        break;
      case SpecialType.Vertical:
        this.drawVerticalFx(graphics, size);
        this.drawRotatingHalo(haloNode, size, true);
        break;
      case SpecialType.Bomb:
        this.drawBombFx(graphics, size);
        break;
      case SpecialType.Rainbow:
        this.drawRainbowFx(graphics, size);
        break;
      default:
        break;
    }

    tween(node)
      .repeatForever(
        tween<Node>()
          .to(0.55, { scale: new Vec3(1.08, 1.08, 1) })
          .to(0.55, { scale: new Vec3(1, 1, 1) }),
      )
      .start();
    tween(opacity)
      .repeatForever(
        tween<UIOpacity>()
          .to(0.55, { opacity: 255 })
          .to(0.55, { opacity: 172 }),
      )
      .start();
  }

  private resetSpecialFx(node: Node | null): void {
    if (!node) {
      return;
    }

    const opacity = node.getComponent(UIOpacity);
    Tween.stopAllByTarget(node);
    if (opacity) {
      Tween.stopAllByTarget(opacity);
      opacity.opacity = 255;
    }
    node.scale = Vec3.ONE.clone();
    const graphics = node.getComponent(Graphics);
    graphics?.clear();
    node.children.forEach((child) => {
      const childOpacity = child.getComponent(UIOpacity);
      Tween.stopAllByTarget(child);
      if (childOpacity) {
        Tween.stopAllByTarget(childOpacity);
        childOpacity.opacity = 255;
      }
      child.angle = 0;
      child.scale = Vec3.ONE.clone();
      child.getComponent(Graphics)?.clear();
      child.active = false;
    });
    node.active = false;
  }

  private drawHorizontalFx(graphics: Graphics, size: number): void {
    graphics.fillColor = new Color(130, 239, 255, 72);
    graphics.roundRect(-size * 0.52, -6, size * 1.04, 12, 6);
    graphics.fill();

    graphics.fillColor = new Color(227, 251, 255, 220);
    graphics.roundRect(-size * 0.48, -3, size * 0.96, 6, 3);
    graphics.fill();

    graphics.fillColor = new Color(200, 246, 255, 190);
    this.tracePolygon(graphics, [
      { x: -size * 0.6, y: 0 },
      { x: -size * 0.72, y: 9 },
      { x: -size * 0.72, y: -9 },
    ]);
    graphics.fill();
    this.tracePolygon(graphics, [
      { x: size * 0.6, y: 0 },
      { x: size * 0.72, y: 9 },
      { x: size * 0.72, y: -9 },
    ]);
    graphics.fill();
  }

  private drawVerticalFx(graphics: Graphics, size: number): void {
    graphics.fillColor = new Color(130, 239, 255, 72);
    graphics.roundRect(-6, -size * 0.52, 12, size * 1.04, 6);
    graphics.fill();

    graphics.fillColor = new Color(227, 251, 255, 220);
    graphics.roundRect(-3, -size * 0.48, 6, size * 0.96, 3);
    graphics.fill();

    graphics.fillColor = new Color(200, 246, 255, 190);
    this.tracePolygon(graphics, [
      { x: 0, y: size * 0.62 },
      { x: 9, y: size * 0.74 },
      { x: -9, y: size * 0.74 },
    ]);
    graphics.fill();
    this.tracePolygon(graphics, [
      { x: 0, y: -size * 0.62 },
      { x: 9, y: -size * 0.74 },
      { x: -9, y: -size * 0.74 },
    ]);
    graphics.fill();
  }

  private drawRotatingHalo(node: Node, size: number, clockwise: boolean): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(new Size(size + 24, size + 24));

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    graphics.clear();
    node.active = true;
    node.angle = 0;
    opacity.opacity = 238;

    const radius = size * 0.61;
    graphics.strokeColor = new Color(152, 244, 255, 178);
    graphics.lineWidth = 3.2;
    graphics.circle(0, 0, radius);
    graphics.stroke();

    graphics.strokeColor = new Color(255, 238, 180, 130);
    graphics.lineWidth = 1.8;
    graphics.circle(0, 0, radius + 7);
    graphics.stroke();

    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      graphics.fillColor = i % 2 === 0 ? new Color(255, 246, 188, 235) : new Color(134, 238, 255, 218);
      graphics.circle(x, y, i % 2 === 0 ? 4.5 : 3.2);
      graphics.fill();
    }

    const spinAngle = clockwise ? -360 : 360;
    tween(node)
      .repeatForever(tween<Node>().by(1.05, { angle: spinAngle }))
      .start();
    tween(opacity)
      .repeatForever(
        tween<UIOpacity>()
          .to(0.5, { opacity: 255 })
          .to(0.5, { opacity: 178 }),
      )
      .start();
  }

  private drawBombFx(graphics: Graphics, size: number): void {
    graphics.strokeColor = new Color(255, 208, 120, 205);
    graphics.lineWidth = 3;
    graphics.circle(0, 0, size * 0.44);
    graphics.stroke();

    graphics.strokeColor = new Color(255, 238, 184, 128);
    graphics.lineWidth = 2;
    graphics.circle(0, 0, size * 0.58);
    graphics.stroke();

    graphics.fillColor = new Color(255, 228, 162, 210);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const x = Math.cos(angle) * size * 0.66;
      const y = Math.sin(angle) * size * 0.66;
      graphics.circle(x, y, 2.8);
      graphics.fill();
    }
  }

  private drawRainbowFx(graphics: Graphics, size: number): void {
    const rings = [
      new Color(255, 137, 198, 170),
      new Color(130, 239, 255, 150),
      new Color(255, 233, 120, 136),
    ];
    rings.forEach((color, index) => {
      graphics.strokeColor = color;
      graphics.lineWidth = 2.2;
      graphics.circle(0, 0, size * (0.38 + index * 0.12));
      graphics.stroke();
    });
  }

  private traceShape(graphics: Graphics, shape: ItemShape, size: number, centerY: number): void {
    switch (shape) {
      case "circle":
        graphics.circle(0, centerY, size * 0.44);
        break;
      case "triangle":
        this.traceRoundedPolygon(
          graphics,
          [
            { x: 0, y: centerY + size * 0.46 },
            { x: -size * 0.44, y: centerY - size * 0.34 },
            { x: size * 0.44, y: centerY - size * 0.34 },
          ],
          size * 0.12,
        );
        break;
      case "diamond":
        this.traceRoundedPolygon(
          graphics,
          [
            { x: 0, y: centerY + size * 0.5 },
            { x: size * 0.42, y: centerY },
            { x: 0, y: centerY - size * 0.5 },
            { x: -size * 0.42, y: centerY },
          ],
          size * 0.12,
        );
        break;
      case "star":
        this.traceRoundedPolygon(graphics, this.buildStarPoints(size * 0.46, size * 0.25, centerY), size * 0.08);
        break;
      case "hexagon":
        this.traceRegularPolygon(graphics, 6, size * 0.43, centerY, Math.PI / 6, size * 0.1);
        break;
      case "pentagon":
        this.traceRegularPolygon(graphics, 5, size * 0.43, centerY, -Math.PI / 2, size * 0.1);
        break;
      case "square":
        graphics.roundRect(-size * 0.36, centerY - size * 0.36, size * 0.72, size * 0.72, size * 0.16);
        break;
      case "octagon":
        this.traceRegularPolygon(graphics, 8, size * 0.43, centerY, Math.PI / 8, size * 0.08);
        break;
      case "sun":
        this.traceRoundedPolygon(graphics, this.buildSunPoints(size * 0.45, size * 0.32, centerY), size * 0.06);
        break;
      case "oval":
        this.traceRoundedPolygon(graphics, this.buildEllipsePoints(size * 0.44, size * 0.31, centerY, 16), size * 0.08);
        break;
      case "plus":
        this.traceRoundedPolygon(
          graphics,
          [
            { x: -size * 0.15, y: centerY + size * 0.43 },
            { x: size * 0.15, y: centerY + size * 0.43 },
            { x: size * 0.15, y: centerY + size * 0.15 },
            { x: size * 0.43, y: centerY + size * 0.15 },
            { x: size * 0.43, y: centerY - size * 0.15 },
            { x: size * 0.15, y: centerY - size * 0.15 },
            { x: size * 0.15, y: centerY - size * 0.43 },
            { x: -size * 0.15, y: centerY - size * 0.43 },
            { x: -size * 0.15, y: centerY - size * 0.15 },
            { x: -size * 0.43, y: centerY - size * 0.15 },
            { x: -size * 0.43, y: centerY + size * 0.15 },
            { x: -size * 0.15, y: centerY + size * 0.15 },
          ],
          size * 0.07,
        );
        break;
      case "heart":
        this.traceHeart(graphics, size, centerY);
        break;
      case "shield":
        this.traceRoundedPolygon(
          graphics,
          [
            { x: -size * 0.38, y: centerY + size * 0.32 },
            { x: 0, y: centerY + size * 0.46 },
            { x: size * 0.38, y: centerY + size * 0.32 },
            { x: size * 0.3, y: centerY - size * 0.2 },
            { x: 0, y: centerY - size * 0.48 },
            { x: -size * 0.3, y: centerY - size * 0.2 },
          ],
          size * 0.1,
        );
        break;
      case "teardrop":
        this.traceTeardrop(graphics, size, centerY);
        break;
      case "flower":
        this.traceRoundedPolygon(graphics, this.buildFlowerPoints(size * 0.42, size * 0.28, centerY), size * 0.07);
        break;
      case "crown":
        this.traceRoundedPolygon(
          graphics,
          [
            { x: -size * 0.43, y: centerY - size * 0.32 },
            { x: size * 0.43, y: centerY - size * 0.32 },
            { x: size * 0.38, y: centerY + size * 0.24 },
            { x: size * 0.17, y: centerY + size * 0.02 },
            { x: 0, y: centerY + size * 0.43 },
            { x: -size * 0.17, y: centerY + size * 0.02 },
            { x: -size * 0.38, y: centerY + size * 0.24 },
          ],
          size * 0.08,
        );
        break;
      case "arrow":
        this.traceRoundedPolygon(
          graphics,
          [
            { x: 0, y: centerY + size * 0.46 },
            { x: size * 0.4, y: centerY + size * 0.04 },
            { x: size * 0.18, y: centerY + size * 0.04 },
            { x: size * 0.18, y: centerY - size * 0.42 },
            { x: -size * 0.18, y: centerY - size * 0.42 },
            { x: -size * 0.18, y: centerY + size * 0.04 },
            { x: -size * 0.4, y: centerY + size * 0.04 },
          ],
          size * 0.08,
        );
        break;
      case "clover":
        this.traceRoundedPolygon(graphics, this.buildCloverPoints(size * 0.36, centerY), size * 0.06);
        break;
      case "crescent":
        this.traceCrescent(graphics, size, centerY);
        break;
      case "cloud":
        this.traceCloud(graphics, size, centerY);
        break;
      case "leaf":
        this.traceLeaf(graphics, size, centerY);
        break;
      case "gem":
        this.traceRoundedPolygon(
          graphics,
          [
            { x: -size * 0.28, y: centerY + size * 0.42 },
            { x: size * 0.28, y: centerY + size * 0.42 },
            { x: size * 0.46, y: centerY + size * 0.08 },
            { x: 0, y: centerY - size * 0.48 },
            { x: -size * 0.46, y: centerY + size * 0.08 },
          ],
          size * 0.08,
        );
        break;
      default:
        this.traceRegularPolygon(graphics, 4, size * 0.42, centerY, Math.PI / 4, size * 0.1);
        break;
    }
  }

  private traceRegularPolygon(
    graphics: Graphics,
    sides: number,
    radius: number,
    centerY: number,
    startAngle: number,
    cornerRadius = 0,
  ): void {
    const points: ShapePoint[] = [];
    for (let i = 0; i < sides; i += 1) {
      const angle = startAngle + (Math.PI * 2 * i) / sides;
      points.push({
        x: Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    if (cornerRadius > 0) {
      this.traceRoundedPolygon(graphics, points, cornerRadius);
      return;
    }
    this.tracePolygon(graphics, points);
  }

  private buildStarPoints(outerRadius: number, innerRadius: number, centerY: number): ShapePoint[] {
    const points: ShapePoint[] = [];
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (Math.PI * i) / 5;
      points.push({
        x: Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    return points;
  }

  private buildEllipsePoints(radiusX: number, radiusY: number, centerY: number, count: number): ShapePoint[] {
    const points: ShapePoint[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      points.push({
        x: Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      });
    }
    return points;
  }

  private buildFlowerPoints(outerRadius: number, innerRadius: number, centerY: number): ShapePoint[] {
    const points: ShapePoint[] = [];
    for (let i = 0; i < 16; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 16;
      points.push({
        x: Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    return points;
  }

  private buildSunPoints(outerRadius: number, innerRadius: number, centerY: number): ShapePoint[] {
    const points: ShapePoint[] = [];
    for (let i = 0; i < 20; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 20;
      points.push({
        x: Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    return points;
  }

  private buildCloverPoints(radius: number, centerY: number): ShapePoint[] {
    const points: ShapePoint[] = [];
    const centers = [
      { x: 0, y: centerY + radius * 0.45 },
      { x: radius * 0.42, y: centerY },
      { x: 0, y: centerY - radius * 0.38 },
      { x: -radius * 0.42, y: centerY },
    ];
    centers.forEach((center, petalIndex) => {
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + petalIndex * (Math.PI / 2) + ((i - 2) * Math.PI) / 12;
        points.push({
          x: center.x + Math.cos(angle) * radius * 0.62,
          y: center.y + Math.sin(angle) * radius * 0.62,
        });
      }
    });
    return points;
  }

  private traceHeart(graphics: Graphics, size: number, centerY: number): void {
    const top = centerY + size * 0.18;
    graphics.moveTo(0, centerY - size * 0.42);
    graphics.bezierCurveTo(-size * 0.48, centerY - size * 0.06, -size * 0.48, top + size * 0.28, -size * 0.18, top);
    graphics.bezierCurveTo(-size * 0.06, top + size * 0.16, 0, top + size * 0.16, 0, top + size * 0.02);
    graphics.bezierCurveTo(0, top + size * 0.16, size * 0.06, top + size * 0.16, size * 0.18, top);
    graphics.bezierCurveTo(size * 0.48, top + size * 0.28, size * 0.48, centerY - size * 0.06, 0, centerY - size * 0.42);
    graphics.close();
  }

  private traceTeardrop(graphics: Graphics, size: number, centerY: number): void {
    graphics.moveTo(0, centerY + size * 0.48);
    graphics.bezierCurveTo(size * 0.43, centerY + size * 0.1, size * 0.35, centerY - size * 0.42, 0, centerY - size * 0.44);
    graphics.bezierCurveTo(-size * 0.35, centerY - size * 0.42, -size * 0.43, centerY + size * 0.1, 0, centerY + size * 0.48);
    graphics.close();
  }

  private traceCrescent(graphics: Graphics, size: number, centerY: number): void {
    graphics.moveTo(size * 0.29, centerY + size * 0.39);
    graphics.bezierCurveTo(-size * 0.14, centerY + size * 0.31, -size * 0.4, centerY + size * 0.03, -size * 0.38, centerY - size * 0.23);
    graphics.bezierCurveTo(-size * 0.35, centerY - size * 0.47, -size * 0.04, centerY - size * 0.53, size * 0.28, centerY - size * 0.34);
    graphics.bezierCurveTo(size * 0.06, centerY - size * 0.28, -size * 0.06, centerY - size * 0.11, -size * 0.05, centerY + size * 0.07);
    graphics.bezierCurveTo(-size * 0.04, centerY + size * 0.24, size * 0.08, centerY + size * 0.36, size * 0.29, centerY + size * 0.39);
    graphics.close();
  }

  private traceCloud(graphics: Graphics, size: number, centerY: number): void {
    graphics.moveTo(-size * 0.43, centerY - size * 0.1);
    graphics.bezierCurveTo(-size * 0.48, centerY + size * 0.1, -size * 0.3, centerY + size * 0.25, -size * 0.13, centerY + size * 0.18);
    graphics.bezierCurveTo(-size * 0.04, centerY + size * 0.43, size * 0.28, centerY + size * 0.4, size * 0.31, centerY + size * 0.14);
    graphics.bezierCurveTo(size * 0.48, centerY + size * 0.1, size * 0.5, centerY - size * 0.18, size * 0.28, centerY - size * 0.25);
    graphics.lineTo(-size * 0.26, centerY - size * 0.25);
    graphics.bezierCurveTo(-size * 0.36, centerY - size * 0.25, -size * 0.44, centerY - size * 0.2, -size * 0.43, centerY - size * 0.1);
    graphics.close();
  }

  private traceLeaf(graphics: Graphics, size: number, centerY: number): void {
    graphics.moveTo(-size * 0.42, centerY - size * 0.05);
    graphics.bezierCurveTo(-size * 0.2, centerY + size * 0.44, size * 0.34, centerY + size * 0.42, size * 0.45, centerY + size * 0.02);
    graphics.bezierCurveTo(size * 0.16, centerY - size * 0.36, -size * 0.28, centerY - size * 0.36, -size * 0.42, centerY - size * 0.05);
    graphics.close();
  }

  private tracePolygon(graphics: Graphics, points: ShapePoint[]): void {
    if (points.length === 0) {
      return;
    }

    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.close();
  }

  private traceRoundedPolygon(graphics: Graphics, points: ShapePoint[], radius: number): void {
    if (points.length < 3) {
      this.tracePolygon(graphics, points);
      return;
    }

    const rounded: { start: ShapePoint; corner: ShapePoint; end: ShapePoint }[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const prev = points[(i - 1 + points.length) % points.length];
      const corner = points[i];
      const next = points[(i + 1) % points.length];
      const toPrev = this.pointToward(corner, prev, radius);
      const toNext = this.pointToward(corner, next, radius);
      rounded.push({ start: toPrev, corner, end: toNext });
    }

    graphics.moveTo(rounded[0].end.x, rounded[0].end.y);
    for (let i = 1; i < rounded.length; i += 1) {
      graphics.lineTo(rounded[i].start.x, rounded[i].start.y);
      graphics.quadraticCurveTo(
        rounded[i].corner.x,
        rounded[i].corner.y,
        rounded[i].end.x,
        rounded[i].end.y,
      );
    }
    graphics.lineTo(rounded[0].start.x, rounded[0].start.y);
    graphics.quadraticCurveTo(
      rounded[0].corner.x,
      rounded[0].corner.y,
      rounded[0].end.x,
      rounded[0].end.y,
    );
    graphics.close();
  }

  private pointToward(from: ShapePoint, to: ShapePoint, distance: number): ShapePoint {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
    const clamped = Math.min(distance, length * 0.45);
    return {
      x: from.x + (dx / length) * clamped,
      y: from.y + (dy / length) * clamped,
    };
  }

  private enhance(color: Color, delta: number, alpha = color.a): Color {
    return new Color(
      Math.max(0, Math.min(color.r + delta, 255)),
      Math.max(0, Math.min(color.g + delta, 255)),
      Math.max(0, Math.min(color.b + delta, 255)),
      alpha,
    );
  }
}
