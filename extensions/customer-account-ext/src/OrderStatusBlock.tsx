import {
  reactExtension,
  Card,
  Text,
  View,
  BlockStack,
  Heading,
  HeadingGroup,
  Button,
  Divider,
  Grid,
  Link,
  BlockSpacer,
  Modal,
  Form,
  TextField,
  InlineStack,
  useApi,
  DropZone,
  Select,
  DateField,
  SkeletonImage,
  Icon,
  Pressable,
} from "@shopify/ui-extensions-react/customer-account";
import { useState } from "react";

export default reactExtension("customer-account.page.render", () => (
  <HeadingGroup>
    <MembershipModule />
    <MyPetsModule />
    <MembershipTiers />
  </HeadingGroup>
));

function MembershipModule() {
  return (
    <Card>
      <BlockStack spacing="loose">
        <View />
        <Grid
          columns={{
            default: ["1fr"],
            conditionals: [
              { conditions: { viewportInlineSize: { min: "medium" } }, value: ["fill", "auto"] },
            ],
          }}
          blockAlignment="center"
          padding={{
            default: "base",
            conditionals: [
              { conditions: { viewportInlineSize: { min: "medium" } }, value: "loose" },
            ],
          }}
        >
          <View>
            <View />
            <Text size="large" emphasis="bold" appearance="accent">
              HICC PET Membership
            </Text>
          </View>
          <View>
            <Text emphasis="bold" size="large" appearance="accent">
              Store Credit:
            </Text>
            <Text emphasis="bold" size="large" appearance="accent">
              $2000
            </Text>
            <View />
          </View>
        </Grid>
        <View />
      </BlockStack>
    </Card>
  );
}

function MyPetsModule() {
  const modalId = "create-pet-modal";
  const { ui } = useApi();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [breed, setBreed] = useState("");
  const [petIns, setPetIns] = useState("");
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);
  const [avatarError, setAvatarError] = useState<string | undefined>(undefined);
  const [birthday, setBirthday] = useState("" as string);
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [modalVariant, setModalVariant] = useState<'form' | 'success'>('form');
  const [petMedicalCondition, setPetMedicalCondition] = useState("");
  const [penHover, setPenHover] = useState(false);
  const [deleteHover, setDeleteHover] = useState(false);
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editPetName, setEditPetName] = useState("");
  const [editPetType, setEditPetType] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editBirthday, setEditBirthday] = useState("" as string);
  const [editWeight, setEditWeight] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPetIns, setEditPetIns] = useState("");
  const [editPetMedicalCondition, setEditPetMedicalCondition] = useState("");
  const [editAvatarFiles, setEditAvatarFiles] = useState<File[]>([]);
  const [editAvatarError, setEditAvatarError] = useState<string | undefined>(undefined);
  const isEditValid =
    editPhoneNumber.trim().length > 0 &&
    editPetName.trim().length > 0 &&
    editPetType !== "" &&
    editBreed !== "" &&
    editBirthday.trim().length > 0 &&
    editWeight.trim().length > 0 &&
    editGender !== "";
  const isValid =
    phoneNumber.trim().length > 0 &&
    petName.trim().length > 0 &&
    petType !== "" &&
    breed !== "" && birthday.trim().length > 0 && weight.trim().length > 0 && gender !== "";
  return (
    <BlockStack spacing="extraLoose">
      <View />
      <BlockStack spacing="loose">
        <Heading level={1}>
          <Text appearance="accent">My Pets</Text>
        </Heading>
        <Card>
          <BlockStack spacing="loose" padding="loose">
            <View />
            <View padding="loose">
              <BlockStack spacing="loose" inlineAlignment="center">
                <Text size="medium" appearance="info">You haven&apos;t created the pet profile yet.</Text>
                <Text size="medium" appearance="info">创建档案享受 lounge 权益</Text>
                <Button
                  kind="primary"
                  overlay={
                    <Modal id={modalId} size="max" padding onOpen={() => setModalVariant('form')}>
                      <BlockStack spacing="loose">
                        {modalVariant === 'form' ? (
                          <>
                            <View padding="none" inlineAlignment="center">
                              <Text size="extraLarge" emphasis="bold" appearance="accent">Create an archive</Text>
                            </View>
                            <Form
                              onSubmit={() => {
                                if (!isValid) return;
                                setModalVariant('success');
                              }}
                            >
                              <BlockStack spacing="loose">
                                <Text emphasis="bold" appearance="accent">个人信息</Text>
                                <TextField
                                  label="* Phone Number"
                                  value={phoneNumber}
                                  onChange={setPhoneNumber}
                                />
                                <Text emphasis="bold" appearance="accent">宠物信息</Text>
                                <View>
                                  <DropZone
                                    label="Avatar"
                                    accept="image/*"
                                    multiple={false}
                                    error={avatarError}
                                    onInput={(files) => {
                                      setAvatarFiles(files);
                                      setAvatarError(undefined);
                                    }}
                                    onDropRejected={() => {
                                      setAvatarFiles([]);
                                      setAvatarError("仅支持图片类型");
                                    }}
                                  />
                                </View>
                                {avatarFiles.length > 0 && (
                                  <Text size="small" appearance="subdued">
                                    已选择: {avatarFiles[0].name}
                                  </Text>
                                )}
                                <TextField
                                  label="* Pet name"
                                  value={petName}
                                  onChange={setPetName}
                                />

                                <Grid
                                  columns={{
                                    default: ["1fr"],
                                    conditionals: [
                                      { conditions: { viewportInlineSize: { min: "small" } }, value: ["1fr", "1fr"] },
                                    ],
                                  }}
                                  spacing={{
                                    default: "base",
                                    conditionals: [
                                      { conditions: { viewportInlineSize: { min: "small" } }, value: "loose" },
                                    ],
                                  }}
                                >
                                  <Select
                                    label="* Pet Type"
                                    value={petType}
                                    onChange={setPetType}
                                    options={[
                                      {value: "", label: "Please select"},
                                      { value: "Cat", label: "Cat" },
                                      { value: "Dog", label: "Dog" },
                                    ]}
                                  />
                                  <Select
                                    label="* Breed"
                                    value={breed}
                                    onChange={setBreed}
                                    options={[
                                      {value: "", label: "Please select"},
                                      { value: "Poodle", label: "Poodle" },
                                      { value: "Test", label: "Test" },
                                    ]}
                                  />
                                </Grid>

                                <TextField
                                  label="宠物ins"
                                  value={petIns}
                                  onChange={setPetIns}
                                />

                                <Grid
                                  columns={{
                                    default: ["1fr"],
                                    conditionals: [
                                      { conditions: { viewportInlineSize: { min: "small" } }, value: ["1fr", "1fr"] },
                                    ],
                                  }}
                                  spacing={{
                                    default: "base",
                                    conditionals: [
                                      { conditions: { viewportInlineSize: { min: "small" } }, value: "loose" },
                                    ],
                                  }}
                                >
                                  <DateField
                                    label="* Birthday (estimate if you're not sure)"
                                    value={birthday}
                                    onChange={setBirthday}
                                  />
                                  <TextField
                                    label="* Weight"
                                    value={weight}
                                    onChange={setWeight}
                                  />
                                </Grid>

                                <BlockStack spacing="tight">
                                  <Text>* Gender</Text>
                                  <InlineStack spacing="loose">
                                    <Button
                                      kind={gender === 'male' ? 'primary' : 'secondary'}
                                      onPress={() => setGender('male')}
                                    >
                                      Male
                                    </Button>
                                    <Button
                                      kind={gender === 'female' ? 'primary' : 'secondary'}
                                      onPress={() => setGender('female')}
                                    >
                                      Female
                                    </Button>
                                  </InlineStack>
                                </BlockStack>

                                <TextField
                                  label="My pet has medical condition"
                                  value={petMedicalCondition}
                                  onChange={setPetMedicalCondition}
                                />

                                <InlineStack inlineAlignment="end" spacing="base">
                                  <Button kind="primary" disabled={!isValid} onPress={() => {
                                    if (!isValid) return;
                                    setModalVariant('success');
                                  }}>
                                    Submit
                                  </Button>
                                </InlineStack>
                              </BlockStack>
                            </Form>
                            <View />
                          </>
                        ) : (
                          <>
                            <View padding="none" inlineAlignment="center">
                              <Text size="extraLarge" emphasis="bold" appearance="accent">恭喜你成为Lounge会员</Text>
                            </View>
                            <View />

                            <View background="subdued" borderRadius="base" padding="loose">
                              {/* 顶部横幅 */}
                              <View padding="base" background="subdued" borderRadius="base">
                                <BlockStack inlineAlignment="center">
                                  <Text size="large" emphasis="bold" appearance="accent">以下权益均用于线下</Text>
                                </BlockStack>
                              </View>

                              <BlockSpacer spacing="loose" />

                              {/* 权益 2x2 宫格 */}
                              <Grid
                                columns={{
                                  default: ["1fr"],
                                  conditionals: [
                                    { conditions: { viewportInlineSize: { min: "small" } }, value: ["1fr", "1fr"] },
                                  ],
                                }}
                                spacing="loose"
                              >
                                {/* Free Gifts */}
                                <Card>
                                  <BlockStack padding="loose" spacing="tight" inlineAlignment="center">
                                    <SkeletonImage inlineSize={80} blockSize={48} />
                                    <Text emphasis="bold">Free Gifts</Text>
                                    <Text size="small" appearance="subdued">Values $12.9</Text>
                                  </BlockStack>
                                </Card>

                                {/* Party */}
                                <Card>
                                  <BlockStack padding="loose" spacing="tight" inlineAlignment="center">
                                    <SkeletonImage inlineSize={80} blockSize={48} />
                                    <Text emphasis="bold">Party</Text>
                                    <Text size="small" appearance="subdued">Sneak Peek</Text>
                                  </BlockStack>
                                </Card>

                                {/* showroom */}
                                <Card>
                                  <BlockStack padding="loose" spacing="tight" inlineAlignment="center">
                                    <SkeletonImage inlineSize={80} blockSize={48} />
                                    <Text emphasis="bold">showroom</Text>
                                    <Text size="small" appearance="subdued">Free 1 h Value $199</Text>
                                  </BlockStack>
                                </Card>

                                {/* 1v1Class */}
                                <Card>
                                  <BlockStack padding="loose" spacing="tight" inlineAlignment="center">
                                    <SkeletonImage inlineSize={80} blockSize={48} />
                                    <Text emphasis="bold">1v1Class</Text>
                                    <Text size="small" appearance="subdued">Value $100</Text>
                                  </BlockStack>
                                </Card>
                              </Grid>
                              <BlockStack inlineAlignment="center">
                                <BlockSpacer spacing="loose" />
                                <Button kind="primary" onPress={() => ui.overlay.close(modalId)}>
                                  Use Now
                                </Button>
                              </BlockStack>
                            </View>

                            <BlockStack inlineAlignment="center">
                              <Text size="small" appearance="subdued">使用须知以卡券为准</Text>
                            </BlockStack>
                          </>
                        )}
                      </BlockStack>
                    </Modal>
                  }
                >
                  + Add a new Pets
                </Button>
              </BlockStack>
            </View>
            <View />
          </BlockStack>
        </Card>

        <Card>
          <Grid columns={["fill", "auto"]} padding="loose">
            {/* 第一列：头像+名字同行，下面是详细信息 */}
            <BlockStack spacing="tight">
              <InlineStack spacing="base" blockAlignment="center">
                <SkeletonImage inlineSize={40} blockSize={40} />
                <Text size="medium">Pet Name</Text>
              </InlineStack>
              <InlineStack spacing="tight">
                <Text size="medium">Type:</Text>
                <Text size="medium">Cat</Text>
              </InlineStack>
              <InlineStack spacing="tight">
                <Text size="medium">Breed:</Text>
                <Text size="medium">Unknow</Text>
              </InlineStack>
              <InlineStack spacing="tight">
                <Text size="medium">Birthday:</Text>
                <Text size="medium">Oct 18, 2021</Text>
              </InlineStack>
            </BlockStack>

            {/* 第二列：图标一行展示，整体贴底 */}
            <Grid rows={["fill", "auto"]}>
              <View />
              <InlineStack spacing="base" inlineAlignment="end">
                <Pressable
                  overlay={
                    <Modal id="edit-pet-modal" size="max" padding>
                      <BlockStack spacing="loose">
                        <View padding="none" inlineAlignment="center">
                          <Text size="extraLarge" emphasis="bold" appearance="accent">Edit an archive</Text>
                        </View>
                        <Form onSubmit={() => { if (!isEditValid) return; ui.overlay.close('edit-pet-modal'); }}>
                          <BlockStack spacing="loose">
                            <Text emphasis="bold" appearance="accent">个人信息</Text>
                            <TextField label="* Phone Number" value={editPhoneNumber} onChange={setEditPhoneNumber} />
                            <Text emphasis="bold" appearance="accent">宠物信息</Text>
                            <View>
                              <DropZone
                                label="Avatar"
                                accept="image/*"
                                multiple={false}
                                error={editAvatarError}
                                onInput={(files) => {
                                  setEditAvatarFiles(files);
                                  setEditAvatarError(undefined);
                                }}
                                onDropRejected={() => {
                                  setEditAvatarFiles([]);
                                  setEditAvatarError("仅支持图片类型");
                                }}
                              />
                            </View>
                            {editAvatarFiles.length > 0 && (
                              <Text size="small" appearance="subdued">已选择: {editAvatarFiles[0].name}</Text>
                            )}
                            <TextField label="* Pet name" value={editPetName} onChange={setEditPetName} />
                            <Grid columns={{ default: ["1fr"], conditionals: [{ conditions: { viewportInlineSize: { min: "small" } }, value: ["1fr", "1fr"] }] }} spacing={{ default: "base", conditionals: [{ conditions: { viewportInlineSize: { min: "small" } }, value: "loose" }] }}>
                              <Select label="* Pet Type" value={editPetType} onChange={setEditPetType} options={[{ value: "", label: "Please select" }, { value: "Cat", label: "Cat" }, { value: "Dog", label: "Dog" }]} />
                              <Select label="* Breed" value={editBreed} onChange={setEditBreed} options={[{ value: "", label: "Please select" }, { value: "Poodle", label: "Poodle" }, { value: "Test", label: "Test" }]} />
                            </Grid>
                            <TextField label="宠物ins" value={editPetIns} onChange={setEditPetIns} />
                            <Grid columns={{ default: ["1fr"], conditionals: [{ conditions: { viewportInlineSize: { min: "small" } }, value: ["1fr", "1fr"] }] }} spacing={{ default: "base", conditionals: [{ conditions: { viewportInlineSize: { min: "small" } }, value: "loose" }] }}>
                              <DateField label="* Birthday (estimate if you're not sure)" value={editBirthday} onChange={setEditBirthday} />
                              <TextField label="* Weight" value={editWeight} onChange={setEditWeight} />
                            </Grid>
                            <BlockStack spacing="tight">
                              <Text>* Gender</Text>
                              <InlineStack spacing="loose">
                                <Button kind={editGender === 'male' ? 'primary' : 'secondary'} onPress={() => setEditGender('male')}>Male</Button>
                                <Button kind={editGender === 'female' ? 'primary' : 'secondary'} onPress={() => setEditGender('female')}>Female</Button>
                              </InlineStack>
                            </BlockStack>
                            <TextField label="My pet has medical condition" value={editPetMedicalCondition} onChange={setEditPetMedicalCondition} />
                            <InlineStack inlineAlignment="end" spacing="base">
                              <Button kind="primary" disabled={!isEditValid}>Submit</Button>
                            </InlineStack>
                          </BlockStack>
                        </Form>
                      </BlockStack>
                    </Modal>
                  }
                  onPointerEnter={() => setPenHover(true)}
                  onPointerLeave={() => setPenHover(false)}
                >
                  <Icon source="pen" appearance={penHover ? "accent" : "base"} />
                </Pressable>
                {true && (
                  <Pressable
                    overlay={
                      <Modal id="confirm-delete" padding>
                        <BlockStack spacing="loose">
                          <Text appearance="info">Delete the existing files?</Text>
                          <InlineStack inlineAlignment="end" spacing="base">
                            <Button kind="primary" onPress={() => ui.overlay.close('confirm-delete')}>
                              Cancel
                            </Button>
                            <Button kind="secondary" onPress={() => ui.overlay.close('confirm-delete')}>
                              Delete
                            </Button>
                          </InlineStack>
                        </BlockStack>
                      </Modal>
                    }
                    onPointerEnter={() => setDeleteHover(true)}
                    onPointerLeave={() => setDeleteHover(false)}
                  >
                    <Icon source="delete" appearance={deleteHover ? "accent" : "base"} />
                  </Pressable>
                )}
              </InlineStack>
            </Grid>
          </Grid>
        </Card>
      </BlockStack>
    </BlockStack>
  );
}

function MembershipTiers() {
  // 模拟用户当前会员状态 - 实际项目中会从API获取
  return (
    <BlockStack spacing="extraLoose">
      <View />
      <BlockStack spacing="loose">
        <HeadingGroup>
          <Heading level={1}>
            <Text appearance="accent">HICC Pet Club</Text>
          </Heading>
          <Card>
            <BlockStack spacing="loose" padding="loose">
              <View />
              <Grid
                columns={{
                  default: ["1fr"],
                  conditionals: [
                    { conditions: { viewportInlineSize: { min: "small" } }, value: ["1fr", "1fr"] },
                    { conditions: { viewportInlineSize: { min: "medium" } }, value: ["1fr", "1fr", "1fr"] },
                  ],
                }}
                spacing={{
                  default: "base",
                  conditionals: [
                    { conditions: { viewportInlineSize: { min: "medium" } }, value: "loose" },
                  ],
                }}
              >
                {/* Lounge */}
                <Grid border="base" borderRadius="base">
                  <Grid rows={["auto", "auto", "fill"]}>
                    <View padding="base">
                      <BlockStack spacing="loose" inlineAlignment="center">
                        <View padding="tight">
                          <Text
                            size="large"
                            emphasis="bold"
                            appearance="accent"
                          >
                            Lounge
                          </Text>
                        </View>
                      </BlockStack>
                    </View>
                    <Divider />
                    <Grid rows={"fill"} padding="base">
                      <Grid rows={["auto", "fill", "auto"]}>
                        <BlockStack>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Reward
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Welcome gift</Text>
                          </View>
                          <View padding="base">
                            <Text>Gift for Birthday</Text>
                          </View>
                          <View padding="base">
                            <Text>1v1 Personalized GroomingClass</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Grooming
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Free Aromatherapyor Grass Mud Spa</Text>
                          </View>
                          <View padding="base">
                            <Text>Free Massage</Text>
                          </View>
                          <BlockSpacer spacing="loose" />
                        </BlockStack>
                        <View />
                        <Button kind="primary" disabled>
                          你已经享受了以下权益
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Circle */}
                <Grid border="base" borderRadius="base">
                  <Grid rows={["auto", "auto", "fill"]}>
                    <View padding="base">
                      <Grid columns={["fill", "auto"]} rows={["auto"]}>
                        <BlockStack spacing="loose" inlineAlignment="center">
                          <View padding="tight">
                            <Text
                              size="large"
                              emphasis="bold"
                              appearance="accent"
                            >
                              Circle
                            </Text>
                          </View>
                        </BlockStack>
                        {/* 角标 - 右上角定位 */}
                        <View
                          padding="tight"
                          background="subdued"
                          border="base"
                          borderRadius="base"
                        >
                          <Text
                            size="small"
                            emphasis="bold"
                            appearance="accent"
                          >
                            ×2
                          </Text>
                        </View>
                      </Grid>
                    </View>
                    <Divider />
                    <Grid rows={"fill"} padding="base">
                      <Grid rows={["auto", "fill", "auto"]}>
                        <BlockStack>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Reward
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Welcome gift</Text>
                          </View>
                          <View padding="base">
                            <Text>Gift for Birthday</Text>
                          </View>
                          <View padding="base">
                            <Text>1v1 Personalized GroomingClass</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Grooming
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Free Aromatherapyor Grass Mud Spa</Text>
                          </View>
                          <View padding="base">
                            <Text>Free Massage</Text>
                          </View>
                          <View padding="base">
                            <Text>10 sessions grooming</Text>
                          </View>
                          <BlockSpacer spacing="loose" />
                        </BlockStack>
                        <View />
                        <Button kind="primary">$1000 Save $429</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Prive */}
                <Grid border="base" borderRadius="base">
                  <Grid rows={["auto", "auto", "fill"]}>
                    <View padding="base">
                      <BlockStack spacing="loose" inlineAlignment="center">
                        <View padding="tight">
                          <Text
                            size="large"
                            emphasis="bold"
                            appearance="accent"
                          >
                            Prive
                          </Text>
                        </View>
                      </BlockStack>
                    </View>
      <Divider />
                    <Grid rows={"fill"} padding="base">
                      <Grid rows={["auto", "fill", "auto"]}>
                        <BlockStack>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Reward
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Welcome gift</Text>
                          </View>
                          <View padding="base">
                            <Text>Gift for Birthday</Text>
                          </View>
                          <View padding="base">
                            <Text>1v1 Personalized GroomingClass</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Grooming
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Free Aromatherapyor Grass Mud Spa</Text>
                          </View>
                          <View padding="base">
                            <Text>Free Message</Text>
                          </View>
                          <View padding="base">
                            <Text>20 sessions grooming</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Showroom
                            </Text>
                          </View>
                          <BlockSpacer spacing="loose" />
                        </BlockStack>
                        <View />
                        <Button kind="primary">$2000 Save $429</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              {/* 隐私协议 */}
              <Text size="small" appearance="subdued">
                完整权利内容请阅读Hicc Pet
                <Link to="www.baidu.com">会员协议条款</Link>、
                <Link to="www.baidu.com">隐私条款说明</Link>、
                <Link to="www.baidu.com">取消与退款</Link>
              </Text>
              <View />
            </BlockStack>
          </Card>
        </HeadingGroup>
      </BlockStack>
    </BlockStack>
  );
}
