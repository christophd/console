import * as classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import * as _ from 'lodash';
import {
  ActionGroup,
  Button,
  FormGroup,
  Form,
  InputGroupText,
  TextInput,
  Tooltip,
  InputGroup,
  TextArea,
} from '@patternfly/react-core';
import { HelpIcon, MinusIcon, PlusIcon } from '@patternfly/react-icons';
import {
  ButtonBar,
  Dropdown,
  ExternalLink,
  Firehose,
  HandlePromiseProps,
  RequestSizeInput,
  withHandlePromise,
} from '@console/internal/components/utils';
import {
  apiVersionForModel,
  k8sCreate,
  referenceForModel,
  K8sResourceKind,
} from '@console/internal/module/k8s';
import { ModalComponentProps } from '@console/internal/components/factory';
import { ResourceDropdown, getAPIVersion, getName, isObjectSC } from '@console/shared';
import { SecretModel } from '@console/internal/models';
import { DashboardCardPopupLink } from '@console/shared/src/components/dashboard/dashboard-card/DashboardCardLink';
import { SecretType } from '@console/internal/components/secrets/create-secret';
import { history } from '@console/internal/components/utils/router';
import { StorageClassDropdown } from '@console/internal/components/utils/storage-class-dropdown';
import { StorageClass } from '@console/internal/components/storage-class-form';
import { CEPH_STORAGE_NAMESPACE } from '@console/ceph-storage-plugin/src/constants';
import { NooBaaBackingStoreModel } from '../../models';
import './create-bs.scss';
import {
  BC_PROVIDERS,
  AWS_REGIONS,
  NOOBAA_TYPE_MAP,
  PROVIDERS_NOOBAA_MAP,
  BUCKET_LABEL_NOOBAA_MAP,
} from '../../constants';

const PROVIDERS = (() => {
  const values = _.values(BC_PROVIDERS);
  return _.zipObject(values, values);
})();

const awsRegionItems = _.zipObject(AWS_REGIONS, AWS_REGIONS);
const externalProviders = [
  BC_PROVIDERS.AWS,
  BC_PROVIDERS.AZURE,
  BC_PROVIDERS.S3,
  BC_PROVIDERS.GCP,
  BC_PROVIDERS.IBM,
];
const endpointSupported = [BC_PROVIDERS.S3, BC_PROVIDERS.IBM];

/**
 * aws-s3, s3 compatible, IBM COS share the same form
 */
const S3EndPointType: React.FC<S3EndpointTypeProps> = (props) => {
  const { t } = useTranslation();

  const [showSecret, setShowSecret] = React.useState(true);
  const { provider, namespace, state, dispatch } = props;

  const targetLabel =
    provider === BC_PROVIDERS.AZURE
      ? t('noobaa-storage-plugin~Target Blob Container')
      : t('noobaa-storage-plugin~Target Bucket');
  const credentialField1Label =
    provider === BC_PROVIDERS.AZURE
      ? t('noobaa-storage-plugin~Account Name')
      : t('noobaa-storage-plugin~Access Key');
  const credentialField2Label =
    provider === BC_PROVIDERS.AZURE
      ? t('noobaa-storage-plugin~Account Key')
      : t('noobaa-storage-plugin~Secret Key');
  const resources = [
    {
      isList: true,
      namespace,
      kind: SecretModel.kind,
      prop: 'secrets',
    },
  ];

  const switchToSecret = () => {
    setShowSecret(true);
    dispatch({ type: 'setAccessKey', value: '' });
    dispatch({ type: 'setSecretKey', value: '' });
  };

  const switchToCredentials = () => {
    setShowSecret(false);
    dispatch({ type: 'setSecretName', value: '' });
  };

  return (
    <>
      {provider === BC_PROVIDERS.AWS && (
        <FormGroup
          label={t('noobaa-storage-plugin~Region')}
          fieldId="region"
          className="nb-bs-form-entry"
          isRequired
        >
          <Dropdown
            className="nb-bs-form-entry__dropdown"
            menuClassName="nb-bs-form-entry__dropdown--short"
            buttonClassName="nb-bs-form-entry__dropdown"
            onChange={(e) => {
              dispatch({ type: 'setRegion', value: e });
            }}
            items={awsRegionItems}
            selectedKey={AWS_REGIONS[0]}
            aria-label={t('noobaa-storage-plugin~Region Dropdown')}
          />
        </FormGroup>
      )}

      {endpointSupported.includes(provider) && (
        <FormGroup
          label={t('noobaa-storage-plugin~Endpoint')}
          fieldId="endpoint"
          className="nb-bs-form-entry"
          isRequired
        >
          <TextInput
            onChange={(e) => {
              dispatch({ type: 'setEndpoint', value: e });
            }}
            value={state.endpoint}
            aria-label={t('noobaa-storage-plugin~Endpoint Address')}
          />
        </FormGroup>
      )}

      {showSecret ? (
        <FormGroup
          label={t('noobaa-storage-plugin~Secret')}
          fieldId="secret-dropdown"
          className="nb-bs-form-entry nb-bs-form-entry--full-width"
          isRequired
        >
          <InputGroup>
            <Firehose resources={resources}>
              <ResourceDropdown
                selectedKey={state.secretName}
                placeholder={t('noobaa-storage-plugin~Select Secret')}
                className="nb-bs-form-entry__dropdown nb-bs-form-entry__dropdown--full-width"
                buttonClassName="nb-bs-form-entry__dropdown"
                dataSelector={['metadata', 'name']}
                onChange={(e) => dispatch({ type: 'setSecretName', value: e })}
              />
            </Firehose>
            <Button variant="plain" onClick={switchToCredentials}>
              {t('noobaa-storage-plugin~Switch to Credentials')}
            </Button>
          </InputGroup>
        </FormGroup>
      ) : (
        <>
          <FormGroup label={credentialField1Label} fieldId="acess-key">
            <InputGroup>
              <TextInput
                value={state.accessKey}
                onChange={(e) => {
                  dispatch({ type: 'setAccessKey', value: e });
                }}
                aria-label={t('noobaa-storage-plugin~Access Key Field')}
              />
              <Button variant="plain" onClick={switchToSecret}>
                {t('noobaa-storage-plugin~Switch to Secret')}
              </Button>
            </InputGroup>
          </FormGroup>
          <FormGroup
            className="nb-bs-form-entry"
            label={credentialField2Label}
            fieldId="secret-key"
          >
            <TextInput
              value={state.secretKey}
              onChange={(e) => {
                dispatch({ type: 'setSecretKey', value: e });
              }}
              aria-label={t('noobaa-storage-plugin~Secret Key Field')}
              type="password"
            />
          </FormGroup>
        </>
      )}
      <FormGroup
        label={targetLabel}
        fieldId="target-bucket"
        className="nb-bs-form-entry"
        isRequired
      >
        <TextInput
          value={state.target}
          onChange={(e) => dispatch({ type: 'setTarget', value: e })}
          aria-label={targetLabel}
        />
      </FormGroup>
    </>
  );
};

const PVCType: React.FC<PVCTypeProps> = ({ state, dispatch }) => {
  const { t } = useTranslation();

  const [size, setSize] = React.useState('50');
  const [, updateState] = React.useState();
  const units = {
    GiB: 'GiB',
    TiB: 'TiB',
  };

  // Noobaa expected Ti console standrad is to show TiB
  const unitConverter = {
    GiB: 'Gi',
    TiB: 'Ti',
  };

  // Fix for updating the storage class by force rerender
  const forceUpdate = React.useCallback(() => updateState({}), []);

  React.useEffect(() => {
    forceUpdate();
  }, [forceUpdate, state.storageClass]);

  const onChange = (event) => {
    const { value, unit } = event;
    const input = `${value}${unitConverter[unit]}`;
    setSize(value);
    dispatch({ type: 'setVolumeSize', value: input });
  };

  const substract = () => {
    if (state.numVolumes > 1) {
      dispatch({ type: 'setVolumes', value: state.numVolumes - 1 });
    }
  };

  const onlyPvcSCs = React.useCallback((sc: StorageClass) => !isObjectSC(sc), []);

  return (
    <>
      <FormGroup
        label={t('noobaa-storage-plugin~Number of Volumes')}
        fieldId="set-volumes"
        className="nb-bs-form-entry nb-bs-form-entry--short"
        isRequired
      >
        <InputGroup>
          <InputGroupText>
            <MinusIcon onClick={substract} />{' '}
          </InputGroupText>
          <TextInput
            value={state.numVolumes}
            aria-label={t('noobaa-storage-plugin~Number of Volumes')}
          />
          <InputGroupText>
            <PlusIcon
              onClick={() => dispatch({ type: 'setVolumes', value: state.numVolumes + 1 })}
            />{' '}
          </InputGroupText>
        </InputGroup>
      </FormGroup>
      <FormGroup
        label={t('noobaa-storage-plugin~Volume Size')}
        fieldId="volume-size"
        className="nb-bs-form-entry nb-bs-form-entry--short"
        isRequired
      >
        <RequestSizeInput
          name={t('noobaa-storage-plugin~Volume Size')}
          onChange={onChange}
          dropdownUnits={units}
          defaultRequestSizeUnit="GiB"
          defaultRequestSizeValue={size}
        />
      </FormGroup>
      <FormGroup fieldId="storage-class" className="nb-bs-form-entry" isRequired>
        <StorageClassDropdown
          onChange={(sc) => dispatch({ type: 'setStorageClass', value: getName(sc) })}
          defaultClass="ocs-storagecluster-ceph-rbd"
          id="sc-dropdown"
          filter={onlyPvcSCs}
          required
        />
      </FormGroup>
    </>
  );
};

const GCPEndpointType: React.FC<GCPEndPointTypeProps> = (props) => {
  const { t } = useTranslation();

  const [fileData, setFileData] = React.useState('');
  const [inputData, setInputData] = React.useState('');
  const [showSecret, setShowSecret] = React.useState(false);
  const { state, dispatch, namespace } = props;

  const resources = [
    {
      isList: true,
      namespace,
      kind: SecretModel.kind,
      prop: 'secrets',
    },
  ];

  const toggleShowSecret = () => setShowSecret((isShown) => !isShown);

  const gcpHelpText = (
    <DashboardCardPopupLink
      linkTitle={
        <>
          <HelpIcon />
          {t('noobaa-storage-plugin~Where can I find google cloud credentials?')}
        </>
      }
      popupTitle=" "
    >
      <div>
        {t(
          'noobaa-storage-plugin~Service account keys are needed for Google Cloud Storage authentication. The keys can be found in the service accounts page in the GCP console.',
        )}
        <ExternalLink
          href="https://cloud.google.com/iam/docs/service-accounts#service_account_keys"
          text={t('noobaa-storage-plugin~Learn more')}
        />
      </div>
    </DashboardCardPopupLink>
  );

  const onUpload = (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = _.get(ev, 'target.result');
      setFileData(data);
      setInputData(file.name);
      dispatch({ type: 'setGcpJSON', value: data });
    };
    reader.readAsText(file);
  };

  return (
    <>
      <FormGroup
        className="nb-bs-form-entry"
        helperText={
          !showSecret
            ? t(
                'noobaa-storage-plugin~Upload a .json file with the service account keys provided by google cloud storage.',
              )
            : null
        }
        label={t('noobaa-storage-plugin~Secret Key')}
        fieldId="secret-key"
        isRequired
      >
        {!showSecret ? (
          <InputGroup>
            <TextInput
              isReadOnly
              value={inputData}
              className="nb-bs-form-entry__file-name"
              placeholder={t('noobaa-storage-plugin~Upload JSON')}
              aria-label={t('noobaa-storage-plugin~Uploaded File Name')}
            />
            <div className="inputbtn nb-bs-form-entry-upload-btn">
              <Button
                href="#"
                variant="secondary"
                className="custom-input-btn nb-bs-form-entry-upload-btn__button"
                aria-label={t('noobaa-storage-plugin~Upload File')}
              >
                {t('noobaa-storage-plugin~Browse')}
              </Button>
              <input
                type="file"
                id="inputButton"
                className="nb-bs-form-entry-upload-btn__input"
                onChange={onUpload}
                aria-label={t('noobaa-storage-plugin~Upload File')}
              />
            </div>
            <Button
              variant="plain"
              onClick={toggleShowSecret}
              aria-label={t('noobaa-storage-plugin~Switch to Secret')}
            >
              {t('noobaa-storage-plugin~Switch to Secret')}
            </Button>
          </InputGroup>
        ) : (
          <InputGroup>
            <Firehose resources={resources}>
              <ResourceDropdown
                selectedKey={state.secretName}
                placeholder={t('noobaa-storage-plugin~Select Secret')}
                className="nb-bs-form-entry__dropdown nb-bs-form-entry__dropdown--full-width"
                buttonClassName="nb-bs-form-entry__dropdown"
                dataSelector={['metadata', 'name']}
                ariaLabel={t('noobaa-storage-plugin~Select Secret')}
                onChange={(e) => dispatch({ type: 'setSecretName', value: e })}
              />
            </Firehose>
            <Button
              variant="plain"
              onClick={toggleShowSecret}
              aria-label={t('noobaa-storage-plugin~Switch to upload JSON')}
            >
              {t('noobaa-storage-plugin~Switch to upload JSON')}
            </Button>
          </InputGroup>
        )}
      </FormGroup>
      {!showSecret && (
        <FormGroup className="nb-bs-form-entry" helperText={gcpHelpText} fieldId="gcp-data">
          <TextArea
            aria-label={t('noobaa-storage-plugin~Cluster Metadata')}
            className="nb-bs-form-entry__data-dump"
            value={fileData}
          />
        </FormGroup>
      )}
      <FormGroup
        className="nb-bs-form-entry"
        label={t('noobaa-storage-plugin~Target Bucket')}
        fieldId="target-bucket"
        isRequired
      >
        <TextInput
          value={state.target}
          onChange={(e) => {
            dispatch({ type: 'setTarget', value: e });
          }}
          aria-label={t('noobaa-storage-plugin~Target Bucket')}
        />
      </FormGroup>
    </>
  );
};

type ProviderDataState = {
  secretName: string;
  secretKey: string;
  accessKey: string;
  region: string;
  gcpJSON: string;
  target: string;
  endpoint: string;
  numVolumes: number;
  volumeSize: string;
  storageClass: string;
};

type Action =
  | { type: 'setSecretName'; value: string }
  | { type: 'setSecretKey'; value: string }
  | { type: 'setAccessKey'; value: string }
  | { type: 'setRegion'; value: string }
  | { type: 'setGcpJSON'; value: string }
  | { type: 'setTarget'; value: string }
  | { type: 'setEndpoint'; value: string }
  | { type: 'setVolumes'; value: number }
  | { type: 'setVolumeSize'; value: string }
  | { type: 'setStorageClass'; value: string };

type BSPayload = {
  apiVersion: string;
  kind: string;
  metadata: {
    namespace: string;
    name: string;
  };
  spec: {
    type: string;
    ssl: boolean;
    [key: string]: any;
  };
};

const initialState: ProviderDataState = {
  secretName: '',
  secretKey: '',
  accessKey: '',
  region: AWS_REGIONS[0],
  gcpJSON: '',
  target: '',
  endpoint: '',
  numVolumes: 1,
  volumeSize: '50Gi',
  storageClass: '',
};

const providerDataReducer = (state: ProviderDataState, action: Action) => {
  const { value } = action;
  switch (action.type) {
    case 'setSecretName':
      return Object.assign({}, state, { secretName: value });
    case 'setSecretKey':
      return Object.assign({}, state, { secretKey: value });
    case 'setAccessKey':
      return Object.assign({}, state, { accessKey: value });
    case 'setRegion':
      return Object.assign({}, state, { region: value });
    case 'setGcpJSON':
      return Object.assign({}, state, { gcpJSON: value });
    case 'setTarget':
      return Object.assign({}, state, { target: value });
    case 'setEndpoint':
      return Object.assign({}, state, { endpoint: value });
    case 'setVolumes':
      return Object.assign({}, state, { numVolumes: value });
    case 'setVolumeSize':
      return Object.assign({}, state, { volumeSize: value });
    case 'setStorageClass':
      return Object.assign({}, state, { storageClass: value });
    default:
      return initialState;
  }
};

const secretPayloadCreator = (
  provider: string,
  namespace: string,
  secretName: string,
  field1: string,
  field2 = '',
) => {
  const payload = {
    apiVersion: getAPIVersion(SecretModel),
    kind: SecretModel.kind,
    stringData: {},
    metadata: {
      name: secretName,
      namespace,
    },
    type: SecretType.opaque,
  };

  switch (provider) {
    case BC_PROVIDERS.AZURE:
      payload.stringData = {
        AccountName: field1,
        AccountKey: field2,
      };
      break;
    case BC_PROVIDERS.GCP:
      payload.stringData = {
        GoogleServiceAccountPrivateKeyJson: field1,
      };
      break;
    case BC_PROVIDERS.IBM:
      payload.stringData = {
        IBM_COS_ACCESS_KEY_ID: field1,
        IBM_COS_SECRET_ACCESS_KEY: field2,
      };
      break;
    default:
      payload.stringData = {
        AWS_ACCESS_KEY_ID: field1,
        AWS_SECRET_ACCESS_KEY: field2,
      };
      break;
  }
  return payload;
};

const CreateBackingStoreForm: React.FC<CreateBackingStoreFormProps> = withHandlePromise<
  CreateBackingStoreFormProps & HandlePromiseProps
>((props) => {
  const { t } = useTranslation();
  const [bsName, setBsName] = React.useState('');
  const [provider, setProvider] = React.useState(BC_PROVIDERS.AWS);
  const [providerDataState, providerDataDispatch] = React.useReducer(
    providerDataReducer,
    initialState,
  );

  const handleBsNameTextInputChange = (strVal: string) => {
    if (strVal.length <= 43) {
      setBsName(strVal);
    }
  };

  const {
    cancel,
    className,
    close,
    inProgress,
    errorMessage,
    handlePromise,
    isPage,
    csv,
    namespace,
  } = props;

  const onSubmit = (event) => {
    event.preventDefault();
    /** Create a secret if secret ==='' */
    let { secretName } = providerDataState;
    const promises = [];
    if (!secretName && provider !== BC_PROVIDERS.PVC) {
      secretName = bsName.concat('-secret');
      const { secretKey, accessKey, gcpJSON } = providerDataState;
      const secretPayload = secretPayloadCreator(
        provider,
        namespace,
        secretName,
        accessKey || gcpJSON,
        secretKey,
      );
      providerDataDispatch({ type: 'setSecretName', value: secretName });
      promises.push(k8sCreate(SecretModel, secretPayload));
    }
    /** Payload for bs */
    const bsPayload: BSPayload = {
      apiVersion: apiVersionForModel(NooBaaBackingStoreModel),
      kind: NooBaaBackingStoreModel.kind,
      metadata: {
        namespace,
        name: bsName,
      },
      spec: {
        type: NOOBAA_TYPE_MAP[provider],
        ssl: false,
      },
    };
    if (provider === BC_PROVIDERS.PVC) {
      // eslint-disable-next-line
      bsPayload.spec['pvPool'] = {
        numVolumes: providerDataState.numVolumes,
        storageClass: providerDataState.storageClass,
        resources: {
          requests: {
            storage: providerDataState.volumeSize,
          },
        },
      };
    } else if (externalProviders.includes(provider)) {
      bsPayload.spec = {
        ...bsPayload.spec,
        [PROVIDERS_NOOBAA_MAP[provider]]: {
          [BUCKET_LABEL_NOOBAA_MAP[provider]]: providerDataState.target,
          secret: {
            name: secretName,
            namespace,
          },
        },
      };
    }
    if (provider === BC_PROVIDERS.S3) {
      // eslint-disable-next-line
      bsPayload.spec['s3Compatible'] = {
        // eslint-disable-next-line
        ...bsPayload.spec['s3Compatible'],
        endpoint: providerDataState.endpoint,
      };
    } else if (provider === BC_PROVIDERS.IBM) {
      bsPayload.spec.ibmCos = { ...bsPayload.spec.ibmCos, endpoint: providerDataState.endpoint };
    }
    // Add region in the end
    if (provider === BC_PROVIDERS.AWS) {
      bsPayload.spec.awsS3 = { ...bsPayload.spec.awsS3, region: providerDataState.region };
    }

    promises.push(k8sCreate(NooBaaBackingStoreModel, bsPayload));
    return handlePromise(Promise.all(promises), (resource) => {
      const lastIndex = resource.length - 1;
      if (isPage)
        history.push(
          `/k8s/ns/${namespace}/clusterserviceversions/${getName(csv)}/${referenceForModel(
            NooBaaBackingStoreModel,
          )}/${getName(resource[lastIndex])}`,
        );
      else close();
    });
  };

  return (
    <Form className={classNames('nb-bs-form', className)} onSubmit={onSubmit}>
      <FormGroup
        label={t('noobaa-storage-plugin~Backing Store Name')}
        fieldId="backingstore-name"
        className="nb-bs-form-entry"
        helperText={t(
          'noobaa-storage-plugin~A unique name for the backing store within the project',
        )}
        isRequired
      >
        <Tooltip
          content="Name can contain a max of 43 characters"
          isVisible={bsName.length > 42}
          trigger="manual"
        >
          <TextInput
            onChange={handleBsNameTextInputChange}
            value={bsName}
            maxLength={43}
            placeholder="my-backingstore"
            aria-label={t('noobaa-storage-plugin~Backing Store Name')}
          />
        </Tooltip>
      </FormGroup>

      <FormGroup
        label={t('noobaa-storage-plugin~Provider')}
        fieldId="provider-name"
        className="nb-bs-form-entry"
        isRequired
      >
        <Dropdown
          className="nb-bs-form-entry__dropdown"
          buttonClassName="nb-bs-form-entry__dropdown"
          onChange={setProvider}
          items={PROVIDERS}
          selectedKey={provider}
        />
      </FormGroup>
      {provider === BC_PROVIDERS.GCP && (
        <GCPEndpointType
          state={providerDataState}
          dispatch={providerDataDispatch}
          namespace={CEPH_STORAGE_NAMESPACE}
        />
      )}
      {(provider === BC_PROVIDERS.AWS ||
        provider === BC_PROVIDERS.S3 ||
        provider === BC_PROVIDERS.IBM ||
        provider === BC_PROVIDERS.AZURE) && (
        <S3EndPointType
          provider={provider}
          namespace={CEPH_STORAGE_NAMESPACE}
          state={providerDataState}
          dispatch={providerDataDispatch}
        />
      )}
      {provider === BC_PROVIDERS.PVC && (
        <PVCType state={providerDataState} dispatch={providerDataDispatch} />
      )}
      <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
        <ActionGroup>
          <Button type="submit" variant="primary">
            {t('noobaa-storage-plugin~Create Backing Store')}
          </Button>
          <Button onClick={cancel} variant="secondary">
            {t('noobaa-storage-plugin~Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
});

export default CreateBackingStoreForm;

type CreateBackingStoreFormProps = ModalComponentProps & {
  isPage?: boolean;
  namespace?: string;
  className?: string;
  csv?: K8sResourceKind;
};

type S3EndpointTypeProps = {
  state: ProviderDataState;
  dispatch: React.Dispatch<Action>;
  provider: BC_PROVIDERS;
  namespace: string;
};

type PVCTypeProps = {
  state: ProviderDataState;
  dispatch: React.Dispatch<Action>;
};

type GCPEndPointTypeProps = {
  state: ProviderDataState;
  dispatch: React.Dispatch<Action>;
  namespace: string;
};
