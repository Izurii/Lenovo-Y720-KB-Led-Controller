{
    'targets': [
        {
            'target_name': 'hotkeyAddon',
            'sources': ['src/main.cc'],
            'cflags!': ['-fno-exceptions'],
            'cflags_cc!': ['-fno-exceptions'],
            'include_dirs': [
                "<!@(node -p \"require('node-addon-api').include_dir\")",
                "/usr/local/include/node"
            ],
            'libraries': [
                '<(module_root_dir)/libs/libevdev.so',
            ],
            'defines': ['NAPI_CPP_EXCEPTIONS']
        }
    ]
}
